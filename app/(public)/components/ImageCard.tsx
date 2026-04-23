"use client";

import { getThumbnailUrl, getPublicUrl } from "@/lib/image-loader";
import type { GalleryImage } from "@/types";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { useTrackImageEvent } from "@/hooks/useTrackImageEvent";
import { formatDuration } from "@/lib/upload/video-utils";

interface ImageCardProps {
  image: GalleryImage;
  onClick: () => void;
  index: number;
  priority?: boolean;
}

export function ImageCard({ image, onClick, index, priority = false }: ImageCardProps) {
  const track = useTrackImageEvent();
  const cardRef = useRef<HTMLButtonElement>(null);

  // For videos: use the pre-generated webp thumbnail directly (no Supabase transform).
  // For images: use the transform URL as before.
  const thumbnailSrc =
    image.media_type === "video" && image.video_thumbnail_path
      ? getPublicUrl(image.video_thumbnail_path)
      : getThumbnailUrl(image.thumbnail_path || image.storage_path, 400, 80);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          track(image.id, image.album_id, "view");
          observer.disconnect(); // only track the first view
        }
      },
      { threshold: 0.1 } // fire when 10% visible
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [image.id, image.album_id, track]);

  const handleClick = () => {
    track(image.id, image.album_id, "click");
    onClick();
  };

  const isVideo = image.media_type === "video";

  return (
    <button
      ref={cardRef}
      onClick={handleClick}
      className="group relative aspect-square rounded-lg overflow-hidden bg-bf-cream cursor-pointer animate-fade-in-up focus:outline-none focus:ring-2 focus:ring-bf-rosegold-flat focus:ring-offset-2"
      style={{ animationDelay: `${(index % 8) * 0.05}s` }}
      id={`image-${image.id}`}
    >
      {/* Thumbnail — plain <img> for video posters (already correct size/format), <Image> for photos */}
      {isVideo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailSrc}
          alt={image.filename}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading={priority ? "eager" : "lazy"}
        />
      ) : (
        <Image
          src={thumbnailSrc}
          alt={image.filename}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          loading={priority ? "eager" : "lazy"}
        />
      )}

      {/* Subtle hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />

      {/* Video overlays */}
      {isVideo && (
        <>
          {/* Play icon — always visible so users can distinguish videos from images */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white/80 flex items-center justify-center shadow-md transition-transform duration-200 group-hover:scale-110">
              <svg className="w-5 h-5 text-gray-800 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>

          {/* Duration badge */}
          {image.duration != null && (
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs font-sans font-bold px-1.5 py-0.5 rounded tabular-nums">
              {formatDuration(image.duration)}
            </div>
          )}
        </>
      )}
    </button>
  );
}
