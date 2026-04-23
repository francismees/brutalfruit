/**
 * Upload Queue Manager
 *
 * Manages a queue of file uploads with:
 * - Adaptive concurrency (speed-tested on first image file)
 * - TUS resumable uploads
 * - Per-item retry with exponential backoff
 * - Batch database inserts
 * - Per-item cancel/abort
 * - Pause/resume entire queue
 * - Video pre-processing: client-side thumbnail generation + pre-upload before TUS
 */
import { startTusUpload } from "./tus-upload";
import { generateVideoThumbnail, getVideoDuration } from "./video-utils";
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
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
} from "@/lib/constants";
import type { Upload as TusUploadInstance } from "tus-js-client";
import { createClient } from "@/lib/supabase/client";

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
  media_type: 'image' | 'video';
  duration: number | null;
  video_thumbnail_path: string | null;
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
    const newItems: QueueItem[] = [];

    for (const file of files) {
      const isVideo = file.type.startsWith("video/") || /\.(mp4|mov|webm)$/i.test(file.name);
      const sizeLimit = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

      if (file.size > sizeLimit) {
        alert(`${file.name} is too large. Max size is ${sizeLimit / (1024 * 1024)}MB.`);
        continue;
      }

      const sanitizedFilename = file.name
        .replace(/[^\w\s.-]/g, "")
        .replace(/\s+/g, "-")
        .toLowerCase();

      const item: QueueItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file,
        name: sanitizedFilename,
        size: file.size,
        status: "queued" as const,
        progress: 0,
        retryCount: 0,
        media_type: isVideo ? "video" : "image",
        previewUrl: isVideo
          ? undefined // video thumbnail preview set asynchronously below
          : URL.createObjectURL(file),
      };

      newItems.push(item);

      // For videos: kick off thumbnail generation + duration extraction in the background.
      // Results are stored on the item before processNext() picks it up.
      if (isVideo) {
        this.prepareVideoMetadata(item);
      }
    }

    this.queue = [...this.queue, ...newItems];
    this.notifyUpdate();
  }

  /** Start processing the queue */
  start(): void {
    this.isPaused = false;
    this.registerBeforeUnload();

    const hasQueued = this.queue.some((i) => i.status === "queued");
    if (!hasQueued) return;

    if (!this.speedTested) {
      // Use the first *image* for the speed test (videos are much larger and would skew it).
      // If the queue only has videos, skip the speed test entirely.
      const firstImage = this.queue.find(
        (i) => i.status === "queued" && i.media_type !== "video"
      );

      if (firstImage) {
        this.speedTested = true;
        this.speedTestStartTime = performance.now();
        this.connectionQuality = "testing";
        this.callbacks.onConnectionQuality("testing");
        this.processNext();
      } else {
        // Only videos in the queue — skip speed test, use moderate concurrency
        this.speedTested = true;
        this.concurrency = CONCURRENCY_MODERATE;
        this.connectionQuality = "moderate";
        this.callbacks.onConnectionQuality("moderate");
        this.fillSlots();
      }
    } else {
      this.fillSlots();
    }
  }

  /** Pause all active uploads */
  pause(): void {
    this.isPaused = true;
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
      const tusUpload = this.tusInstances.get(itemId);
      if (tusUpload) {
        try { tusUpload.abort(); } catch { /* ignore */ }
        this.tusInstances.delete(itemId);
      }
      this.activeCount--;
      item.status = "cancelled";
      this.notifyUpdate();
      this.fillSlots();
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

    // For images: extract dimensions (non-blocking, best-effort)
    if (next.media_type !== "video") {
      this.extractDimensions(next);
    }

    // For videos: upload the pre-generated thumbnail first, then start TUS
    if (next.media_type === "video") {
      this.uploadVideoAndThumbnail(next, storagePath);
    } else {
      this.startTusForItem(next, storagePath);
    }
  }

  /**
   * For video items:
   *  1. Upload the thumbnail blob (small webp, standard upload — not TUS)
   *  2. Then kick off TUS for the video file itself
   */
  private async uploadVideoAndThumbnail(item: QueueItem, storagePath: string): Promise<void> {
    // Upload thumbnail if we have one
    if (item.videoThumbnailBlob) {
      try {
        const thumbPath = `${this.albumId}/thumb-video-${Date.now()}-${item.name}.webp`;
        const supabase = createClient();
        const { error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(thumbPath, item.videoThumbnailBlob, {
            contentType: "image/webp",
            upsert: false,
          });

        if (!error) {
          item.videoThumbnailStoragePath = thumbPath;
        } else {
          console.warn("Video thumbnail upload failed (non-fatal):", error.message);
        }
      } catch (err) {
        console.warn("Video thumbnail upload error (non-fatal):", err);
      }
    }

    // Now start the actual TUS upload for the video file
    if (item.status !== "uploading") return; // cancelled while thumbnail was uploading
    this.startTusForItem(item, storagePath);
  }

  private startTusForItem(item: QueueItem, storagePath: string): void {
    const isSpeedTest = this.speedTestStartTime > 0 && item.media_type !== "video";

    const tusUpload = startTusUpload({
      file: item.file,
      storagePath,
      accessToken: this.accessToken,
      onProgress: (percentage) => {
        item.progress = percentage;
        this.notifyUpdate();
      },
      onSuccess: () => {
        this.tusInstances.delete(item.id);
        item.status = "complete";
        item.progress = 100;
        this.activeCount--;

        // Handle speed test completion (images only)
        if (isSpeedTest && this.speedTestStartTime > 0) {
          const elapsed = performance.now() - this.speedTestStartTime;
          this.speedTestStartTime = 0;
          this.adaptConcurrency(elapsed);
        }

        // Accumulate for batch DB insert
        this.pendingDbRecords.push({
          album_id: this.albumId,
          storage_path: storagePath,
          filename: item.name,
          file_size: item.size,
          width: item.width ?? null,
          height: item.height ?? null,
          media_type: item.media_type ?? "image",
          duration: item.duration ?? null,
          video_thumbnail_path: item.videoThumbnailStoragePath ?? null,
        });

        if (this.pendingDbRecords.length >= BATCH_INSERT_SIZE) {
          this.flushBatch();
        }

        this.notifyUpdate();
        this.checkCompletion();
        this.fillSlots();
      },
      onError: (error) => {
        this.tusInstances.delete(item.id);
        this.activeCount--;

        // Handle speed test failure — use slow defaults
        if (isSpeedTest && this.speedTestStartTime > 0) {
          this.speedTestStartTime = 0;
          this.adaptConcurrency(999999);
        }

        if (item.retryCount < MAX_RETRY_COUNT) {
          item.status = "retrying";
          item.retryCount++;
          const delay = RETRY_DELAYS[item.retryCount - 1] || 5000;
          this.notifyUpdate();

          setTimeout(() => {
            if (item.status === "retrying") {
              item.status = "queued";
              item.progress = 0;
              this.notifyUpdate();
              if (!this.isPaused) this.fillSlots();
            }
          }, delay);
        } else {
          item.status = "failed";
          item.error = error.message || "Upload failed after retries";
          this.notifyUpdate();
          this.checkCompletion();
          this.fillSlots();
        }
      },
    });

    this.tusInstances.set(item.id, tusUpload);
    this.notifyUpdate();
  }

  /**
   * Pre-generate thumbnail and extract duration for a video item.
   * Runs in the background while the item sits in the queue.
   * Updates previewUrl so the queue UI can show a thumbnail preview.
   */
  private async prepareVideoMetadata(item: QueueItem): Promise<void> {
    try {
      const [thumbnailBlob, duration] = await Promise.all([
        generateVideoThumbnail(item.file),
        getVideoDuration(item.file),
      ]);

      item.videoThumbnailBlob = thumbnailBlob;
      item.duration = duration;
      // Use the blob as the queue-list preview thumbnail
      item.previewUrl = URL.createObjectURL(thumbnailBlob);
      this.notifyUpdate();
    } catch (err) {
      // Non-fatal: video will upload without a thumbnail
      console.warn("Video metadata preparation failed:", err);
    }
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
      }
    } catch (err) {
      console.error("Batch insert network error:", err);
    }
  }

  private checkCompletion(): void {
    if (!this.isActive()) {
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
