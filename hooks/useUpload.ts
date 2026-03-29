"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { UploadQueueManager } from "@/lib/upload/upload-queue";
import type { QueueItem, ConnectionQuality } from "@/types";

interface UseUploadOptions {
  albumId: string;
  onComplete?: () => void;
}

interface UseUploadReturn {
  /** Current queue items */
  items: QueueItem[];
  /** Whether any uploads are active or queued */
  isUploading: boolean;
  /** Whether the queue is paused */
  isPaused: boolean;
  /** Detected connection quality */
  connectionQuality: ConnectionQuality;
  /** Overall progress { completed, total, failed, cancelled } */
  progress: { completed: number; total: number; failed: number; cancelled: number };
  /** Add files to the queue */
  addFiles: (files: FileList | File[]) => void;
  /** Start processing the queue */
  startUpload: () => void;
  /** Pause all active uploads */
  pauseAll: () => void;
  /** Resume from pause */
  resumeAll: () => void;
  /** Cancel all remaining queued items */
  cancelRemaining: () => void;
  /** Cancel a specific item */
  cancelItem: (itemId: string) => void;
  /** Retry a specific failed item */
  retryItem: (itemId: string) => void;
  /** Retry all failed items */
  retryAllFailed: () => void;
  /** Clear completed/failed/cancelled items from the list */
  clearCompleted: () => void;
}

export function useUpload({ albumId, onComplete }: UseUploadOptions): UseUploadReturn {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>("testing");
  const [progress, setProgress] = useState({ completed: 0, total: 0, failed: 0, cancelled: 0 });

  const managerRef = useRef<UploadQueueManager | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Get or lazily create the queue manager
  const getManager = useCallback(async (): Promise<UploadQueueManager | null> => {
    if (managerRef.current) return managerRef.current;
    if (!albumId) return null;

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return null;

    const manager = new UploadQueueManager(albumId, session.access_token, {
      onQueueUpdate: (updatedItems) => {
        setItems(updatedItems);
        const hasActive = updatedItems.some(
          (i) => i.status === "queued" || i.status === "uploading" || i.status === "retrying"
        );
        setIsUploading(hasActive);

        const total = updatedItems.length;
        const completed = updatedItems.filter((i) => i.status === "complete").length;
        const failed = updatedItems.filter((i) => i.status === "failed").length;
        const cancelled = updatedItems.filter((i) => i.status === "cancelled").length;
        setProgress({ completed, total, failed, cancelled });
      },
      onConnectionQuality: (quality) => {
        setConnectionQuality(quality);
      },
      onQueueComplete: () => {
        setIsUploading(false);
        onCompleteRef.current?.();
      },
    });

    managerRef.current = manager;
    return manager;
  }, [albumId]);

  // Cleanup on unmount or albumId change
  useEffect(() => {
    return () => {
      managerRef.current?.destroy();
      managerRef.current = null;
    };
  }, [albumId]);

  const addFiles = useCallback(
    async (newFiles: FileList | File[]) => {
      const manager = await getManager();
      if (!manager) return;
      manager.addFiles(Array.from(newFiles));
    },
    [getManager]
  );

  const startUpload = useCallback(async () => {
    const manager = await getManager();
    if (!manager) return;
    setIsUploading(true);
    setIsPaused(false);
    manager.start();
  }, [getManager]);

  const pauseAll = useCallback(() => {
    managerRef.current?.pause();
    setIsPaused(true);
  }, []);

  const resumeAll = useCallback(() => {
    managerRef.current?.resume();
    setIsPaused(false);
  }, []);

  const cancelRemaining = useCallback(() => {
    managerRef.current?.cancelRemaining();
  }, []);

  const cancelItem = useCallback((itemId: string) => {
    managerRef.current?.cancelItem(itemId);
  }, []);

  const retryItem = useCallback((itemId: string) => {
    managerRef.current?.retryItem(itemId);
  }, []);

  const retryAllFailed = useCallback(() => {
    managerRef.current?.retryAllFailed();
  }, []);

  const clearCompleted = useCallback(() => {
    setItems((prev) =>
      prev.filter((i) => i.status !== "complete" && i.status !== "failed" && i.status !== "cancelled")
    );
  }, []);

  return {
    items,
    isUploading,
    isPaused,
    connectionQuality,
    progress,
    addFiles,
    startUpload,
    pauseAll,
    resumeAll,
    cancelRemaining,
    cancelItem,
    retryItem,
    retryAllFailed,
    clearCompleted,
  };
}
