/**
 * TUS Resumable Upload wrapper for Supabase Storage.
 *
 * Uses the tus-js-client library to upload files via the TUS protocol,
 * enabling automatic resume on connection drops.
 */
import * as tus from "tus-js-client";
import { TUS_CHUNK_SIZE, STORAGE_BUCKET } from "@/lib/constants";

export interface TusUploadOptions {
  file: File;
  storagePath: string;
  accessToken: string;
  onProgress: (percentage: number) => void;
  onSuccess: () => void;
  onError: (error: Error) => void;
}

/**
 * Start a TUS resumable upload to Supabase Storage.
 * Returns the tus.Upload instance so the caller can .abort() or .pause().
 */
export function startTusUpload({
  file,
  storagePath,
  accessToken,
  onProgress,
  onSuccess,
  onError,
}: TusUploadOptions): tus.Upload {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  const upload = new tus.Upload(file, {
    endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
    retryDelays: [0, 1000, 3000, 5000],
    headers: {
      authorization: `Bearer ${accessToken}`,
      "x-upsert": "true",
    },
    uploadDataDuringCreation: true,
    removeFingerprintOnSuccess: true,
    metadata: {
      bucketName: STORAGE_BUCKET,
      objectName: storagePath,
      contentType: file.type,
      cacheControl: "3600",
    },
    chunkSize: TUS_CHUNK_SIZE,
    onError: (error) => {
      onError(error instanceof Error ? error : new Error(String(error)));
    },
    onProgress: (bytesUploaded, bytesTotal) => {
      onProgress(Math.round((bytesUploaded / bytesTotal) * 100));
    },
    onSuccess,
  });

  // Check for previous incomplete uploads and resume
  upload.findPreviousUploads().then((previousUploads) => {
    if (previousUploads.length) {
      upload.resumeFromPreviousUpload(previousUploads[0]);
    }
    upload.start();
  });

  return upload;
}
