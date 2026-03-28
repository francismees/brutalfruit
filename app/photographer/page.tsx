"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUpload } from "@/hooks/useUpload";
import { ACCEPTED_EXTENSIONS } from "@/lib/constants";
import { formatFileSize } from "@/lib/utils";
import { getThumbnailUrl } from "@/lib/image-loader";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Album, GalleryImage } from "@/types";
import Image from "next/image";

export default function PhotographerPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState("");
  const [recentImages, setRecentImages] = useState<GalleryImage[]>([]);
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { files, isUploading, addFiles, startUpload, cancelAll } = useUpload({
    albumId: selectedAlbumId,
    onComplete: () => fetchRecentImages(),
  });

  // Fetch assigned albums
  useEffect(() => {
    async function fetchAlbums() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const isAdmin = user.user_metadata?.role === "admin";

      if (isAdmin) {
        // Admin gets all active/published albums
        const { data: albumData } = await supabase
          .from("albums")
          .select("*")
          .order("created_at", { ascending: false });

        if (albumData) {
          setAlbums(albumData);
          if (albumData.length > 0) setSelectedAlbumId(albumData[0].id);
        }
      } else {
        // Photographer gets explicitly assigned albums
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
    }
  };

  const handleDelete = async (imageId: string, storagePath: string) => {
    if (!confirm("Are you sure you want to delete this image?")) return;
    const supabase = createClient();
    
    // Attempt storage deletion
    await supabase.storage.from("event-photos").remove([storagePath]);
    
    // Database deletion
    await supabase.from("images").delete().eq("id", imageId);
    
    fetchRecentImages();
  };

  const pendingFiles = files.filter((f) => f.status === "pending" || f.status === "uploading");

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <header className="flex items-center justify-between px-6 lg:px-8 py-5 border-b border-bf-gray-200 bg-white">
        <h2 className="label-ui text-bf-gray-700 tracking-wider">GOLDEN HOUR ADMIN</h2>
        <div className="flex items-center gap-4">
          <span className="label-ui text-bf-rosegold-flat">Upload Center</span>
        </div>
      </header>

      <div className="px-6 lg:px-8 py-8 max-w-5xl">
        {/* Title */}
        <h1 className="heading-display text-3xl md:text-4xl mb-2">
          The <em className="heading-display-italic">Capture</em> Session
        </h1>
        <p className="text-editorial text-bf-text-secondary mb-8 max-w-lg">
          Upload your latest high-resolution captures for editorial review. Ensure all files are in RAW or high-quality JPEG format for optimal processing.
        </p>

        {/* Album selector */}
        <div className="mb-8">
          <label className="label-ui text-bf-gray-400 mb-2 block">TARGET ALBUM</label>
          {isLoadingAlbums ? (
            <Skeleton className="w-64 h-12 rounded-xl" />
          ) : (
            <select
              value={selectedAlbumId}
              onChange={(e) => setSelectedAlbumId(e.target.value)}
              className="w-full max-w-xs border border-bf-gray-200 rounded-xl px-4 py-3 text-sm font-serif bg-white focus:outline-none focus:ring-2 focus:ring-bf-rosegold-flat"
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
          className="border-2 border-dashed border-bf-gray-200 rounded-2xl p-12 text-center cursor-pointer hover:border-bf-rosegold-flat transition-colors mb-8"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-bf-cream flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--bf-rosegold-flat)" strokeWidth="1.5">
              <path d="M12 3v13m0-13l-4 4m4-4l4 4M5 19h14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="heading-display text-xl mb-1">Drop your masterpieces here</h3>
          <p className="text-editorial text-bf-gray-400 mb-4">Or click to browse from your device</p>
          <div className="flex items-center justify-center gap-3">
            <span className="label-ui text-[0.65rem] px-3 py-1 border border-bf-gray-200 rounded-full text-bf-gray-400">
              UP TO 50MB
            </span>
            <span className="label-ui text-[0.65rem] px-3 py-1 border border-bf-gray-200 rounded-full text-bf-gray-400">
              RAW / JPG / TIFF
            </span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_EXTENSIONS}
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Upload queue */}
        {pendingFiles.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="label-ui text-bf-rosegold-flat text-[0.65rem]">ACTIVE QUEUE</p>
                <h3 className="heading-display-italic text-xl">Processing Submissions</h3>
              </div>
              <button onClick={cancelAll} className="label-ui text-bf-ruby text-xs hover:underline">
                CANCEL ALL ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pendingFiles.map((file) => (
                <div key={file.id} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-bf-gray-200">
                  {file.previewUrl ? (
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-bf-cream shrink-0">
                      <img src={file.previewUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-bf-cream shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-sans truncate pr-2">{file.name}</p>
                      <span className="text-xs font-sans text-bf-gray-400 tabular-nums shrink-0">
                        {file.status === "error" ? "Failed" : `${file.progress}%`}
                      </span>
                    </div>
                    {file.status === "error" ? (
                      <p className="text-xs text-red-500 font-sans mt-1 max-w-full truncate" title={file.error}>
                        {file.error}
                      </p>
                    ) : (
                      <div className="w-full bg-bf-cream rounded-full h-1.5 mt-1.5">
                        <div
                          className="bg-rosegold h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {!isUploading && (
              <button onClick={startUpload} className="btn-gradient mt-4 px-8">
                START UPLOAD
              </button>
            )}
          </div>
        )}

        {/* Recent contributions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="heading-display text-xl">Recent Contributions</h3>
              <p className="text-sm text-bf-gray-400 font-sans">Assets uploaded to this album</p>
            </div>
          </div>

          {recentImages.length === 0 ? (
            <p className="text-editorial text-bf-gray-400 italic py-8 text-center">
              No uploads yet. Drop your first masterpiece above.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {recentImages.map((image) => (
                <div key={image.id} className="group relative">
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-bf-cream">
                    <Image
                      src={getThumbnailUrl(image.storage_path, 300, 75)}
                      alt={image.filename}
                      fill
                      sizes="200px"
                      className="object-cover"
                    />
                  </div>
                  <button
                    onClick={() => handleDelete(image.id, image.storage_path)}
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
    </div>
  );
}
