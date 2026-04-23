"use client";

import Image from "next/image";
import { getThumbnailUrl, getPublicUrl } from "@/lib/image-loader";
import { formatFileSize } from "@/lib/utils";
import { formatDuration } from "@/lib/upload/video-utils";
import type { GalleryImage, Photographer } from "@/types";

interface ImageGridProps {
  images: GalleryImage[];
  photographers: Photographer[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onPreview: (image: GalleryImage) => void;
  currentUserId: string;
}

export function ImageGrid({
  images,
  photographers,
  selectedIds,
  onToggleSelect,
  onPreview,
  currentUserId
}: ImageGridProps) {
  const getPhotographerInitials = (id: string) => {
    const photographer = photographers.find(p => p.id === id);
    if (!photographer) return "??";
    return photographer.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getPhotographerName = (id: string) => {
    return photographers.find(p => p.id === id)?.display_name || "Unknown";
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 lg:gap-4">
      {images.map((image) => {
        const isSelected = selectedIds.has(image.id);
        const isOwn = image.uploaded_by === currentUserId;
        const initials = getPhotographerInitials(image.uploaded_by || "");
        const isVideo = image.media_type === "video";

        // Video thumbnails: use the pre-generated webp via direct URL (no Supabase transforms).
        // Image thumbnails: use the transform URL as before.
        const thumbnailSrc = isVideo && image.video_thumbnail_path
          ? getPublicUrl(image.video_thumbnail_path)
          : getThumbnailUrl(image.thumbnail_path || image.storage_path, 400, 80);

        return (
          <div
            key={image.id}
            className={`group relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all border-2 ${
              isSelected ? "border-bf-rosegold-flat ring-2 ring-bf-rosegold-flat/20" : "border-transparent hover:border-bf-gray-200"
            }`}
            onClick={() => onToggleSelect(image.id)}
          >
            {isVideo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbnailSrc}
                alt={image.filename}
                className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                  isSelected ? "opacity-75" : ""
                }`}
              />
            ) : (
              <Image
                src={thumbnailSrc}
                alt={image.filename}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 16vw"
                className={`object-cover transition-transform duration-500 group-hover:scale-105 ${
                  isSelected ? "opacity-75" : ""
                }`}
              />
            )}

            {/* Video overlays */}
            {isVideo && (
              <>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center shadow-md">
                    <svg className="w-4 h-4 text-gray-800 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
                {image.duration != null && (
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[0.55rem] font-sans font-bold px-1 py-0.5 rounded tabular-nums pointer-events-none">
                    {formatDuration(image.duration)}
                  </div>
                )}
              </>
            )}

            {/* Selection Checkbox indicator */}
            <div className={`absolute top-2 left-2 w-5 h-5 rounded-full border-2 transition-colors flex items-center justify-center ${
              isSelected
                ? "bg-bf-rosegold-flat border-bf-rosegold-flat"
                : "bg-black/20 border-white/40 group-hover:border-white opacity-0 group-hover:opacity-100"
            }`}>
              {isSelected && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>

            {/* Photographer Badge */}
            <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
               <div
                 className={`w-6 h-6 rounded-lg text-[0.6rem] font-sans font-bold flex items-center justify-center shadow-lg border border-white/20 text-white ${
                   isOwn ? "bg-bf-pink" : "bg-bf-black/60 backdrop-blur-sm"
                 }`}
                 title={`Uploaded by ${getPhotographerName(image.uploaded_by || "")}`}
               >
                 {initials}
               </div>
            </div>

            {/* Quick View Button */}
            <button
               onClick={(e) => {
                 e.stopPropagation();
                 onPreview(image);
               }}
               className="absolute bottom-2 right-2 w-8 h-8 rounded-lg bg-white/90 backdrop-blur-sm text-bf-black opacity-0 group-hover:opacity-100 transition-all hover:bg-white flex items-center justify-center shadow-lg translate-y-2 group-hover:translate-y-0"
               title={isVideo ? "Quick View Video" : "Quick View"}
            >
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                 <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" strokeLinecap="round" strokeLinejoin="round" />
               </svg>
            </button>

            {/* Bottom Info Overlay */}
            <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <p className="text-[0.6rem] font-sans text-white truncate">
                {image.filename}
              </p>
              <p className="text-[0.5rem] font-sans text-white/70">
                {image.file_size ? formatFileSize(image.file_size) : "--"}
                {isVideo && image.duration != null && ` · ${formatDuration(image.duration)}`}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
