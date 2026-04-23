"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUpload } from "@/hooks/useUpload";
import { ACCEPTED_EXTENSIONS, ACCEPTED_TYPES } from "@/lib/constants";
import { formatFileSize } from "@/lib/utils";
import { getThumbnailUrl } from "@/lib/image-loader";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Album, GalleryImage, QueueItem } from "@/types";
import Image from "next/image";

// ─── Status icon helper ───

function StatusIcon({ status }: { status: QueueItem["status"] }) {
  switch (status) {
    case "complete":
      return (
        <span className="text-green-500" title="Complete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      );
    case "uploading":
      return (
        <span className="text-amber-500 animate-spin" title="Uploading">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 11-6.22-8.56" strokeLinecap="round" />
          </svg>
        </span>
      );
    case "retrying":
      return (
        <span className="text-amber-400 animate-pulse" title="Retrying">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 4v6h6M23 20v-6h-6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      );
    case "failed":
      return (
        <span className="text-red-500" title="Failed">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
            <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
          </svg>
        </span>
      );
    case "cancelled":
      return (
        <span className="text-bf-gray-300" title="Cancelled">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" strokeLinecap="round" />
          </svg>
        </span>
      );
    default:
      return <span className="w-2 h-2 rounded-full bg-bf-gray-300 inline-block" title="Queued" />;
  }
}

// ─── Connection quality badge ───

function ConnectionBadge({ quality }: { quality: string }) {
  const config: Record<string, { label: string; color: string; bars: number }> = {
    testing: { label: "Testing speed…", color: "text-bf-gray-400", bars: 0 },
    fast: { label: "Fast · 6 concurrent", color: "text-green-600", bars: 3 },
    moderate: { label: "Moderate · 4 concurrent", color: "text-amber-500", bars: 2 },
    slow: { label: "Slow · 3 concurrent", color: "text-red-400", bars: 1 },
  };
  const c = config[quality] || config.testing;

  return (
    <div className={`flex items-center gap-1.5 ${c.color}`}>
      <div className="flex items-end gap-px h-3.5">
        {[1, 2, 3].map((bar) => (
          <div
            key={bar}
            className={`w-1 rounded-sm transition-colors ${
              bar <= c.bars ? "bg-current" : "bg-bf-gray-200"
            }`}
            style={{ height: `${bar * 33}%` }}
          />
        ))}
      </div>
      <span className="text-[0.6rem] font-sans font-bold uppercase tracking-widest">{c.label}</span>
    </div>
  );
}

// ─── Main shared upload component ───

export function UploadPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState("");
  const [recentImages, setRecentImages] = useState<GalleryImage[]>([]);
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(true);
  const [imageToDelete, setImageToDelete] = useState<{ id: string; storagePath: string; thumbnailPath?: string | null } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
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
  } = useUpload({
    albumId: selectedAlbumId,
    onComplete: () => fetchRecentImages(),
  });

  // Fetch assigned albums (role-aware)
  useEffect(() => {
    async function fetchAlbums() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const isAdmin = user.app_metadata?.role === "admin";

      if (isAdmin) {
        const { data: albumData } = await supabase
          .from("albums")
          .select("*")
          .order("created_at", { ascending: false });

        if (albumData) {
          setAlbums(albumData);
          if (albumData.length > 0) setSelectedAlbumId(albumData[0].id);
        }
      } else {
        const { data: assignments } = await supabase
          .from("album_photographers")
          .select("album_id")
          .eq("photographer_id", user.id);

        if (assignments && assignments.length > 0) {
          const albumIds = assignments.map((a) => a.album_id);
          const { data: albumData } = await supabase
            .from("albums")
            .select("*")
            .in("id", albumIds);

          if (albumData) {
            setAlbums(albumData);
            if (albumData.length > 0) setSelectedAlbumId(albumData[0].id);
          }
        }
      }
      setIsLoadingAlbums(false);
    }
    fetchAlbums();
  }, []);

  const fetchRecentImages = useCallback(async () => {
    if (!selectedAlbumId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("images")
      .select("*")
      .eq("album_id", selectedAlbumId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setRecentImages(data);
  }, [selectedAlbumId]);

  useEffect(() => {
    fetchRecentImages();
  }, [fetchRecentImages]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = "";
    }
  };

  const handleDeleteRequest = (imageId: string, storagePath: string, thumbnailPath?: string | null) => {
    setImageToDelete({ id: imageId, storagePath, thumbnailPath });
  };

  const executeImageDelete = async () => {
    if (!imageToDelete) return;
    const { id, storagePath, thumbnailPath } = imageToDelete;
    
    const supabase = createClient();
    const pathsToDelete = [storagePath, thumbnailPath].filter(Boolean) as string[];
    await supabase.storage.from("event-photos").remove(pathsToDelete);
    await supabase.from("images").delete().eq("id", id);

    setImageToDelete(null);
    fetchRecentImages();
  };

  // ─── Derived state ───

  const activeItems = items.filter((i) => i.status !== "cancelled");
  const hasQueue = activeItems.length > 0;
  const hasQueued = items.some((i) => i.status === "queued");
  const hasFailed = items.some((i) => i.status === "failed");
  const allDone = hasQueue && !isUploading && !items.some((i) => i.status === "queued" || i.status === "retrying");
  const progressPercent = progress.total > 0
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  const selectedAlbumName = albums.find((a) => a.id === selectedAlbumId)?.name || "—";

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-8 max-w-[1360px]">
        <PageHeader
          title="Uploads"
          subtitle="Upload high-resolution captures for editorial review."
        />

        {/* Album selector */}
        <div className="mb-6">
          <label className="label-ui text-bf-gray-400 mb-2 block">UPLOAD TO</label>
          {isLoadingAlbums ? (
            <Skeleton className="w-64 h-12 rounded-xl" />
          ) : (
            <select
              value={selectedAlbumId}
              onChange={(e) => setSelectedAlbumId(e.target.value)}
              disabled={isUploading}
              className="w-full max-w-xs border border-bf-gray-200 rounded-xl px-4 py-3 text-sm font-serif bg-white focus:outline-none focus:ring-2 focus:ring-bf-rosegold-flat disabled:opacity-50"
            >
              {albums.map((album) => (
                <option key={album.id} value={album.id}>
                  {album.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Upload zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-bf-gray-200 rounded-2xl p-12 text-center cursor-pointer hover:border-bf-rosegold-flat transition-colors mb-6"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-bf-cream flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--bf-rosegold-flat)" strokeWidth="1.5">
              <path d="M12 3v13m0-13l-4 4m4-4l4 4M5 19h14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="heading-display text-xl mb-1">Drag and drop files here</h3>
          <p className="text-editorial text-bf-gray-400 mb-4">or click to browse your device</p>
          <div className="flex items-center justify-center gap-3">
            <span className="label-ui text-[0.65rem] px-3 py-1 border border-bf-gray-200 rounded-full text-bf-gray-400">
              IMAGES UP TO 50MB
            </span>
            <span className="label-ui text-[0.65rem] px-3 py-1 border border-bf-gray-200 rounded-full text-bf-gray-400">
              JPG / PNG / WEBP / MP4 / MOV
            </span>
            <span className="label-ui text-[0.65rem] px-3 py-1 border border-bf-gray-200 rounded-full text-bf-gray-400">
              VIDEOS UP TO 500MB
            </span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* ─── Upload Queue Panel ─── */}
        {hasQueue && (
          <div className="mb-6 bg-white rounded-2xl border border-bf-gray-200 overflow-hidden shadow-sm">
            {/* Queue header with overall progress */}
            <div className="px-5 py-4 border-b border-bf-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[0.6rem] font-sans font-bold text-bf-gray-400 uppercase tracking-widest">
                    Uploading to: {selectedAlbumName}
                  </p>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="heading-display text-lg tabular-nums">
                      {progress.completed} / {progress.total - progress.cancelled}
                    </span>
                    <span className="text-xs font-sans text-bf-gray-400">
                      ({progressPercent}%)
                    </span>
                  </div>
                </div>
                <ConnectionBadge quality={connectionQuality} />
              </div>

              {/* Overall progress bar */}
              <div className="w-full bg-bf-cream rounded-full h-2">
                <div
                  className="bg-rosegold h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Status summary line */}
              <div className="flex items-center gap-3 mt-2.5 text-[0.6rem] font-sans font-bold uppercase tracking-widest">
                {progress.failed > 0 && (
                  <span className="text-red-500">{progress.failed} failed</span>
                )}
                {progress.cancelled > 0 && (
                  <span className="text-bf-gray-400">{progress.cancelled} cancelled</span>
                )}
                {hasFailed && (
                  <button
                    onClick={retryAllFailed}
                    className="text-bf-rosegold-flat hover:underline ml-auto"
                  >
                    Retry All Failed
                  </button>
                )}
              </div>
            </div>

            {/* Per-file list */}
            <div className="max-h-[360px] overflow-y-auto divide-y divide-bf-gray-50">
              {activeItems.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 px-5 py-2.5 transition-colors ${
                    item.status === "failed" ? "bg-red-50/50" : ""
                  }`}
                >
                  {item.previewUrl ? (
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-bf-cream shrink-0 relative">
                      {/* eslint-disable-next-line @next/next/no-img-element -- blob URL preview, not optimizable by next/image */}
                      <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
                      {item.media_type === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  ) : item.media_type === 'video' ? (
                    <div className="w-10 h-10 rounded-lg bg-bf-cream shrink-0 flex items-center justify-center text-bf-gray-400">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <polygon points="23 7 16 12 23 17 23 7" />
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-bf-cream shrink-0" />
                  )}

                  <div className="shrink-0 w-5 flex justify-center">
                    <StatusIcon status={item.status} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-sans truncate pr-2">{item.name}</p>
                      <span className="text-xs font-sans text-bf-gray-400 tabular-nums shrink-0">
                        {item.status === "complete"
                          ? formatFileSize(item.size)
                          : item.status === "failed"
                          ? "Failed"
                          : item.status === "retrying"
                          ? `Retry ${item.retryCount}…`
                          : item.status === "uploading"
                          ? `${item.progress}%`
                          : formatFileSize(item.size)}
                      </span>
                    </div>
                    {(item.status === "uploading" || item.status === "retrying") && (
                      <div className="w-full bg-bf-cream rounded-full h-1 mt-1">
                        <div
                          className="bg-rosegold h-1 rounded-full transition-all duration-300"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}
                    {item.status === "failed" && item.error && (
                      <p className="text-[0.65rem] text-red-500 font-sans mt-0.5 truncate" title={item.error}>
                        {item.error}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {item.status === "failed" && (
                      <button
                        onClick={() => retryItem(item.id)}
                        className="w-7 h-7 rounded-full hover:bg-bf-cream flex items-center justify-center text-bf-gray-400 hover:text-bf-rosegold-flat transition-colors"
                        title="Retry"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M1 4v6h6" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M3.51 15a9 9 0 102.13-9.36L1 10" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    )}
                    {item.status !== "complete" && (
                      <button
                        onClick={() => cancelItem(item.id)}
                        className="w-7 h-7 rounded-full hover:bg-red-50 flex items-center justify-center text-bf-gray-300 hover:text-red-500 transition-colors"
                        title="Cancel"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
                          <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Queue controls footer */}
            <div className="px-5 py-3 bg-bf-cream/30 border-t border-bf-gray-100 flex items-center gap-3">
              {!isUploading && hasQueued && (
                <button onClick={startUpload} className="btn-gradient px-6 py-2 text-xs">
                  START UPLOAD
                </button>
              )}
              {isUploading && !isPaused && (
                <button
                  onClick={pauseAll}
                  className="px-5 py-2 rounded-xl text-xs font-sans font-bold border border-bf-gray-200 hover:border-bf-black transition-colors"
                >
                  ⏸ Pause All
                </button>
              )}
              {isPaused && (
                <button
                  onClick={resumeAll}
                  className="btn-gradient px-5 py-2 text-xs"
                >
                  ▶ Resume
                </button>
              )}
              {isUploading && (
                <button
                  onClick={cancelRemaining}
                  className="px-5 py-2 rounded-xl text-xs font-sans font-bold text-red-500 border border-red-200 hover:bg-red-50 transition-colors"
                >
                  Cancel Remaining
                </button>
              )}
              {allDone && (
                <>
                  <div className="flex-1 text-sm font-sans text-green-600 font-medium">
                    ✓ {progress.completed} file{progress.completed !== 1 ? "s" : ""} uploaded
                    {progress.failed > 0 && <span className="text-red-500 ml-1">· {progress.failed} failed</span>}
                  </div>
                  <button
                    onClick={clearCompleted}
                    className="px-5 py-2 rounded-xl text-xs font-sans font-bold text-bf-gray-400 border border-bf-gray-200 hover:border-bf-black transition-colors"
                  >
                    Clear List
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Recent uploads */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="heading-display text-xl">Recent Uploads</h3>
              <p className="text-sm text-bf-gray-400 font-sans">Assets uploaded to this album</p>
            </div>
          </div>

          {recentImages.length === 0 ? (
            <p className="text-editorial text-bf-gray-400 italic py-8 text-center">
              No uploads yet. Drop your first files above.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {recentImages.map((image) => (
                <div key={image.id} className="group relative">
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-bf-cream">
                    <Image
                      src={getThumbnailUrl(image.thumbnail_path || image.storage_path, 300, 75)}
                      alt={image.filename}
                      fill
                      sizes="200px"
                      className="object-cover"
                    />
                  </div>
                  <button
                    onClick={() => handleDeleteRequest(image.id, image.storage_path, image.thumbnail_path)}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    title="Delete image"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <p className="text-xs font-sans truncate mt-1.5 text-bf-text-secondary">
                    {image.filename}
                  </p>
                  <p className="text-[0.65rem] font-sans text-bf-gray-400">
                    {image.file_size ? formatFileSize(image.file_size) : "—"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!imageToDelete}
        onClose={() => setImageToDelete(null)}
        onConfirm={executeImageDelete}
        title="Delete Image"
        message="Are you sure you want to permanently delete this image from the cloud?"
        confirmText="Delete Image"
      />
    </div>
  );
}
