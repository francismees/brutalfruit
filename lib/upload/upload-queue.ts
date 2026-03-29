/**
 * Upload Queue Manager
 *
 * Manages a queue of file uploads with:
 * - Adaptive concurrency (speed-tested on first file)
 * - TUS resumable uploads
 * - Per-item retry with exponential backoff
 * - Batch database inserts
 * - Per-item cancel/abort
 * - Pause/resume entire queue
 */
import { startTusUpload } from "./tus-upload";
import type { QueueItem, ConnectionQuality } from "@/types";
import {
  STORAGE_BUCKET,
  MAX_RETRY_COUNT,
  RETRY_DELAYS,
  BATCH_INSERT_SIZE,
  CONCURRENCY_FAST,
  CONCURRENCY_MODERATE,
  CONCURRENCY_SLOW,
  SPEED_TEST_FAST_THRESHOLD,
  SPEED_TEST_SLOW_THRESHOLD,
  MAX_FILE_SIZE,
} from "@/lib/constants";
import type { Upload as TusUploadInstance } from "tus-js-client";

// ─── Callback types ───

export interface QueueCallbacks {
  /** Called whenever any item's state changes */
  onQueueUpdate: (items: QueueItem[]) => void;
  /** Called when connection quality is determined */
  onConnectionQuality: (quality: ConnectionQuality) => void;
  /** Called when the entire queue is finished (all items complete/failed/cancelled) */
  onQueueComplete: () => void;
}

// ─── Pending DB record (waiting to be batch-inserted) ───

interface PendingDbRecord {
  album_id: string;
  storage_path: string;
  filename: string;
  file_size: number | null;
  width: number | null;
  height: number | null;
}

// ─── Upload Queue Manager ───

export class UploadQueueManager {
  private queue: QueueItem[] = [];
  private tusInstances = new Map<string, TusUploadInstance>();
  private activeCount = 0;
  private concurrency = 3; // default, will adapt after speed test
  private isPaused = false;
  private speedTested = false;
  private speedTestStartTime = 0;
  private albumId: string;
  private accessToken: string;
  private callbacks: QueueCallbacks;
  private pendingDbRecords: PendingDbRecord[] = [];
  private connectionQuality: ConnectionQuality = "testing";
  private beforeUnloadHandler: ((e: BeforeUnloadEvent) => void) | null = null;

  constructor(
    albumId: string,
    accessToken: string,
    callbacks: QueueCallbacks
  ) {
    this.albumId = albumId;
    this.accessToken = accessToken;
    this.callbacks = callbacks;
  }

  // ─── Public API ───

  /** Add files to the queue */
  addFiles(files: File[]): void {
    const newItems: QueueItem[] = files
      .filter((f) => f.size <= MAX_FILE_SIZE)
      .map((file) => {
        const sanitizedFilename = file.name
          .replace(/[^\w\s.-]/g, "")
          .replace(/\s+/g, "-")
          .toLowerCase();

        return {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          file,
          name: sanitizedFilename,
          size: file.size,
          status: "queued" as const,
          progress: 0,
          retryCount: 0,
          previewUrl: file.type.startsWith("image/")
            ? URL.createObjectURL(file)
            : undefined,
        };
      });

    this.queue = [...this.queue, ...newItems];
    this.notifyUpdate();
  }

  /** Start processing the queue */
  start(): void {
    this.isPaused = false;
    this.registerBeforeUnload();

    if (!this.speedTested && this.queue.some((i) => i.status === "queued")) {
      // Upload first file solo as speed test
      this.speedTested = true;
      this.speedTestStartTime = performance.now();
      this.connectionQuality = "testing";
      this.callbacks.onConnectionQuality("testing");
      this.processNext();
    } else {
      // Fill up to concurrency limit
      this.fillSlots();
    }
  }

  /** Pause all active uploads */
  pause(): void {
    this.isPaused = true;
    // Abort active TUS uploads (they can be resumed later)
    for (const [itemId, tusUpload] of this.tusInstances) {
      try {
        tusUpload.abort();
      } catch { /* ignore */ }
      const item = this.queue.find((i) => i.id === itemId);
      if (item && item.status === "uploading") {
        item.status = "queued";
        item.progress = 0;
      }
    }
    this.tusInstances.clear();
    this.activeCount = 0;
    this.notifyUpdate();
  }

  /** Resume after pause */
  resume(): void {
    this.isPaused = false;
    this.fillSlots();
  }

  /** Cancel a single item */
  cancelItem(itemId: string): void {
    const item = this.queue.find((i) => i.id === itemId);
    if (!item) return;

    if (item.status === "uploading") {
      // Abort active TUS upload
      const tusUpload = this.tusInstances.get(itemId);
      if (tusUpload) {
        try { tusUpload.abort(); } catch { /* ignore */ }
        this.tusInstances.delete(itemId);
      }
      this.activeCount--;
      item.status = "cancelled";
      this.notifyUpdate();
      this.fillSlots(); // free slot → pick up next
    } else if (item.status === "queued" || item.status === "failed" || item.status === "retrying") {
      item.status = "cancelled";
      this.notifyUpdate();
    }
  }

  /** Cancel all remaining (queued) items */
  cancelRemaining(): void {
    for (const item of this.queue) {
      if (item.status === "queued") {
        item.status = "cancelled";
      }
    }
    this.notifyUpdate();
  }

  /** Retry a single failed item */
  retryItem(itemId: string): void {
    const item = this.queue.find((i) => i.id === itemId);
    if (!item || item.status !== "failed") return;

    item.status = "queued";
    item.progress = 0;
    item.retryCount = 0;
    item.error = undefined;
    this.notifyUpdate();

    if (!this.isPaused) {
      this.fillSlots();
    }
  }

  /** Retry all failed items */
  retryAllFailed(): void {
    for (const item of this.queue) {
      if (item.status === "failed") {
        item.status = "queued";
        item.progress = 0;
        item.retryCount = 0;
        item.error = undefined;
      }
    }
    this.notifyUpdate();

    if (!this.isPaused) {
      this.fillSlots();
    }
  }

  /** Get current queue snapshot */
  getQueue(): QueueItem[] {
    return [...this.queue];
  }

  /** Get overall progress stats */
  getProgress(): { completed: number; total: number; failed: number; cancelled: number } {
    const total = this.queue.length;
    const completed = this.queue.filter((i) => i.status === "complete").length;
    const failed = this.queue.filter((i) => i.status === "failed").length;
    const cancelled = this.queue.filter((i) => i.status === "cancelled").length;
    return { completed, total, failed, cancelled };
  }

  /** Check if any items are still active or queued */
  isActive(): boolean {
    return this.queue.some(
      (i) => i.status === "queued" || i.status === "uploading" || i.status === "retrying"
    );
  }

  /** Cleanup — call when unmounting */
  destroy(): void {
    this.pause();
    this.unregisterBeforeUnload();
    // Revoke preview URLs
    for (const item of this.queue) {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    }
  }

  // ─── Internal ───

  private fillSlots(): void {
    if (this.isPaused) return;

    while (
      this.activeCount < this.concurrency &&
      this.queue.some((i) => i.status === "queued")
    ) {
      this.processNext();
    }
  }

  private processNext(): void {
    const next = this.queue.find((i) => i.status === "queued");
    if (!next || this.isPaused) return;

    next.status = "uploading";
    next.progress = 0;
    this.activeCount++;

    const storagePath = `${this.albumId}/${Date.now()}-${next.name}`;
    next.storagePath = storagePath;

    // Extract dimensions before upload (non-blocking)
    this.extractDimensions(next);

    const tusUpload = startTusUpload({
      file: next.file,
      storagePath,
      accessToken: this.accessToken,
      onProgress: (percentage) => {
        next.progress = percentage;
        this.notifyUpdate();
      },
      onSuccess: () => {
        this.tusInstances.delete(next.id);
        next.status = "complete";
        next.progress = 100;
        this.activeCount--;

        // Handle speed test completion
        if (this.speedTestStartTime > 0) {
          const elapsed = performance.now() - this.speedTestStartTime;
          this.speedTestStartTime = 0;
          this.adaptConcurrency(elapsed);
        }

        // Accumulate for batch DB insert
        this.pendingDbRecords.push({
          album_id: this.albumId,
          storage_path: storagePath,
          filename: next.name,
          file_size: next.size,
          width: next.width ?? null,
          height: next.height ?? null,
        });

        // Flush batch if threshold reached
        if (this.pendingDbRecords.length >= BATCH_INSERT_SIZE) {
          this.flushBatch();
        }

        this.notifyUpdate();
        this.checkCompletion();
        this.fillSlots();
      },
      onError: (error) => {
        this.tusInstances.delete(next.id);
        this.activeCount--;

        // Handle speed test failure — use slow defaults
        if (this.speedTestStartTime > 0) {
          this.speedTestStartTime = 0;
          this.adaptConcurrency(999999);
        }

        if (next.retryCount < MAX_RETRY_COUNT) {
          next.status = "retrying";
          next.retryCount++;
          const delay = RETRY_DELAYS[next.retryCount - 1] || 5000;
          this.notifyUpdate();

          setTimeout(() => {
            if (next.status === "retrying") {
              next.status = "queued";
              next.progress = 0;
              this.notifyUpdate();
              if (!this.isPaused) this.fillSlots();
            }
          }, delay);
        } else {
          next.status = "failed";
          next.error = error.message || "Upload failed after retries";
          this.notifyUpdate();
          this.checkCompletion();
          this.fillSlots();
        }
      },
    });

    this.tusInstances.set(next.id, tusUpload);
    this.notifyUpdate();
  }

  private adaptConcurrency(elapsedMs: number): void {
    if (elapsedMs < SPEED_TEST_FAST_THRESHOLD) {
      this.concurrency = CONCURRENCY_FAST;
      this.connectionQuality = "fast";
    } else if (elapsedMs < SPEED_TEST_SLOW_THRESHOLD) {
      this.concurrency = CONCURRENCY_MODERATE;
      this.connectionQuality = "moderate";
    } else {
      this.concurrency = CONCURRENCY_SLOW;
      this.connectionQuality = "slow";
    }

    this.callbacks.onConnectionQuality(this.connectionQuality);

    // Fill remaining slots now that concurrency is determined
    this.fillSlots();
  }

  private async extractDimensions(item: QueueItem): Promise<void> {
    if (!item.file.type.startsWith("image/")) return;
    try {
      const bitmap = await createImageBitmap(item.file);
      item.width = bitmap.width;
      item.height = bitmap.height;
      bitmap.close();
    } catch {
      // Non-standard image (RAW, TIFF), skip
    }
  }

  private async flushBatch(): Promise<void> {
    if (this.pendingDbRecords.length === 0) return;

    const batch = [...this.pendingDbRecords];
    this.pendingDbRecords = [];

    try {
      const res = await fetch("/api/images/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: batch }),
      });

      if (!res.ok) {
        console.error("Batch insert failed:", await res.text());
        // Records are already in storage; they'll appear next time the page loads
        // if the photographer navigates to the album management view
      }
    } catch (err) {
      console.error("Batch insert network error:", err);
    }
  }

  private checkCompletion(): void {
    if (!this.isActive()) {
      // Flush any remaining DB records
      this.flushBatch();
      this.unregisterBeforeUnload();
      this.callbacks.onQueueComplete();
    }
  }

  private notifyUpdate(): void {
    this.callbacks.onQueueUpdate([...this.queue]);
  }

  private registerBeforeUnload(): void {
    if (this.beforeUnloadHandler) return;
    this.beforeUnloadHandler = (e: BeforeUnloadEvent) => {
      if (this.isActive()) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", this.beforeUnloadHandler);
  }

  private unregisterBeforeUnload(): void {
    if (this.beforeUnloadHandler) {
      window.removeEventListener("beforeunload", this.beforeUnloadHandler);
      this.beforeUnloadHandler = null;
    }
  }
}
