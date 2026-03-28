"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import { getThumbnailUrl } from "@/lib/image-loader";
import type { GalleryImage } from "@/types";

interface SortableImageProps {
  image: GalleryImage;
}

export function SortableImage({ image }: SortableImageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
    opacity: isDragging ? 0.3 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative aspect-square rounded-xl overflow-hidden cursor-move touch-none border-2 ${
        isDragging ? "border-bf-pink shadow-2xl scale-105" : "border-transparent"
      }`}
      {...attributes}
      {...listeners}
    >
      <Image
        src={getThumbnailUrl(image.thumbnail_path || image.storage_path, 400, 80)}
        alt={image.filename}
        fill
        sizes="(max-width: 768px) 33vw, 20vw"
        className="object-cover pointer-events-none"
      />
      
      {/* Index indicator */}
      <div className="absolute top-2 left-2 w-5 h-5 rounded bg-bf-black/80 text-[0.6rem] text-white flex items-center justify-center font-bold shadow-lg">
        #
      </div>

      {/* Drag handle visual overlay */}
      <div className="absolute inset-0 bg-transparent flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
             <circle cx="9" cy="5" r="1" />
             <circle cx="9" cy="12" r="1" />
             <circle cx="9" cy="19" r="1" />
             <circle cx="15" cy="5" r="1" />
             <circle cx="15" cy="12" r="1" />
             <circle cx="15" cy="19" r="1" />
           </svg>
        </div>
      </div>
    </div>
  );
}
