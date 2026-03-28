"use client";

import { useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { STORAGE_BUCKET, MAX_CONCURRENT_UPLOADS, MAX_FILE_SIZE } from "@/lib/constants";
import type { UploadFile } from "@/types";

interface UseUploadOptions {
  albumId: string;
  onComplete?: () => void;
}

export function useUpload({ albumId, onComplete }: UseUploadOptions) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const activeUploads = useRef(0);
  const queueRef = useRef<UploadFile[]>([]);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const uploadFiles: UploadFile[] = fileArray
      .filter((f) => f.size <= MAX_FILE_SIZE)
      .map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        progress: 0,
        status: "pending" as const,
        previewUrl: file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : undefined,
      }));

    setFiles((prev) => [...prev, ...uploadFiles]);
    queueRef.current = [...queueRef.current, ...uploadFiles];
  }, []);

  const uploadNext = useCallback(async () => {
    if (activeUploads.current >= MAX_CONCURRENT_UPLOADS) return;
    const next = queueRef.current.find((f) => f.status === "pending");
    if (!next) {
      if (activeUploads.current === 0) {
        setIsUploading(false);
        onComplete?.();
      }
      return;
    }

    activeUploads.current++;
    const supabase = createClient();
    const storagePath = `${albumId}/${Date.now()}-${next.file.name}`;

    // Update status
    setFiles((prev) =>
      prev.map((f) => (f.id === next.id ? { ...f, status: "uploading" as const } : f))
    );
    next.status = "uploading";

    try {
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, next.file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Extract dimensions
      let width: number | null = null;
      let height: number | null = null;
      if (next.file.type.startsWith("image/")) {
        try {
          const bitmap = await createImageBitmap(next.file);
          width = bitmap.width;
          height = bitmap.height;
          bitmap.close();
        } catch {
          // Non-standard image (RAW), skip dimension extraction
        }
      }

      // Insert metadata into images table
      const { error: dbError } = await supabase.from("images").insert({
        album_id: albumId,
        storage_path: storagePath,
        filename: next.file.name,
        file_size: next.file.size,
        width,
        height,
      });

      if (dbError) throw dbError;

      // Mark complete
      setFiles((prev) =>
        prev.map((f) =>
          f.id === next.id ? { ...f, progress: 100, status: "complete" as const } : f
        )
      );
    } catch (err) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === next.id
            ? { ...f, status: "error" as const, error: (err as Error).message }
            : f
        )
      );
    } finally {
      activeUploads.current--;
      uploadNext();
    }
  }, [albumId, onComplete]);

  const startUpload = useCallback(() => {
    setIsUploading(true);
    // Start up to MAX_CONCURRENT_UPLOADS
    for (let i = 0; i < MAX_CONCURRENT_UPLOADS; i++) {
      uploadNext();
    }
  }, [uploadNext]);

  const cancelAll = useCallback(() => {
    queueRef.current = [];
    setFiles((prev) =>
      prev.map((f) =>
        f.status === "pending" ? { ...f, status: "error" as const, error: "Cancelled" } : f
      )
    );
    setIsUploading(false);
  }, []);

  const clearCompleted = useCallback(() => {
    setFiles((prev) => prev.filter((f) => f.status !== "complete" && f.status !== "error"));
    queueRef.current = queueRef.current.filter(
      (f) => f.status !== "complete" && f.status !== "error"
    );
  }, []);

  return {
    files,
    isUploading,
    addFiles,
    startUpload,
    cancelAll,
    clearCompleted,
  };
}
