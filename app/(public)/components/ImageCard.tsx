import { getThumbnailUrl } from "@/lib/image-loader";
import type { GalleryImage } from "@/types";
import Image from "next/image";

interface ImageCardProps {
  image: GalleryImage;
  onClick: () => void;
  index: number;
}

export function ImageCard({ image, onClick, index }: ImageCardProps) {
  const thumbnailUrl = getThumbnailUrl(image.storage_path, 400, 80);

  return (
    <button
      onClick={onClick}
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
        loading="lazy"
      />
      {/* Subtle hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
    </button>
  );
}
