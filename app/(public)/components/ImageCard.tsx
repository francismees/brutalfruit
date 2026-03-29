import { getThumbnailUrl } from "@/lib/image-loader";
import type { GalleryImage } from "@/types";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { useTrackImageEvent } from "@/hooks/useTrackImageEvent";

interface ImageCardProps {
  image: GalleryImage;
  onClick: () => void;
  index: number;
  priority?: boolean;
}

export function ImageCard({ image, onClick, index, priority = false }: ImageCardProps) {
  const track = useTrackImageEvent();
  const cardRef = useRef<HTMLButtonElement>(null);
  const thumbnailUrl = getThumbnailUrl(image.thumbnail_path || image.storage_path, 400, 80);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          track(image.id, image.album_id, 'view');
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
    track(image.id, image.album_id, 'click');
    onClick();
  };

  return (
    <button
      ref={cardRef}
      onClick={handleClick}
      className="group relative aspect-square rounded-lg overflow-hidden bg-bf-cream cursor-pointer animate-fade-in-up focus:outline-none focus:ring-2 focus:ring-bf-rosegold-flat focus:ring-offset-2"
      style={{ animationDelay: `${(index % 8) * 0.05}s` }}
      id={`image-${image.id}`}
    >
      <Image
        src={thumbnailUrl}
        alt={image.filename}
        fill
        sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
        className="object-cover group-hover:scale-105 transition-transform duration-500"
        loading={priority ? "eager" : "lazy"}
      />
      {/* Subtle hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
    </button>
  );
}
