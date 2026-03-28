"use client";

import Link from "next/link";
import Image from "next/image";
import { formatDateShort } from "@/lib/utils";
import type { Album } from "@/types";

interface AlbumCardProps {
  album: Album;
  photoCount: number;
  myPhotoCount: number;
}

export function AlbumCard({ album, photoCount, myPhotoCount }: AlbumCardProps) {
  return (
    <Link
      href={`/photographer/albums/${album.slug}`}
      className="group bg-white rounded-2xl overflow-hidden border border-bf-gray-200 hover:border-bf-rosegold-flat transition-all hover:shadow-lg hover:shadow-bf-rosegold-flat/5 flex flex-col"
    >
      <div className="aspect-[4/3] relative bg-bf-cream overflow-hidden">
        {album.cover_image_url ? (
          <Image
            src={
              album.cover_image_url.startsWith("http")
                ? album.cover_image_url
                : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/event-photos/${album.cover_image_url}`
            }
            alt={album.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--bf-gray-200)" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        )}
        
        {/* Badge for published status */}
        <div className="absolute top-3 right-3">
          <span className={`px-2 py-1 rounded-full text-[0.6rem] font-sans font-bold tracking-wider uppercase border ${
            album.is_published 
              ? "bg-green-50 text-green-600 border-green-100" 
              : "bg-bf-cream text-bf-gray-400 border-bf-gray-200"
          }`}>
            {album.is_published ? "Published" : "Draft"}
          </span>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="mb-4">
          <p className="label-ui text-bf-gray-400 text-[0.65rem] mb-1">
            {album.event_date ? formatDateShort(album.event_date) : "No Date Set"}
          </p>
          <h3 className="heading-display text-xl group-hover:text-bf-rosegold-flat transition-colors">
            {album.name}
          </h3>
        </div>

        <div className="mt-auto pt-4 border-t border-bf-gray-100 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[0.65rem] font-sans text-bf-gray-400 uppercase tracking-tight">Total Photos</span>
            <span className="text-sm font-serif font-medium">{photoCount}</span>
          </div>
          <div className="flex flex-col items-end text-right">
            <span className="text-[0.65rem] font-sans text-bf-rosegold-flat uppercase tracking-tight font-bold">My Uploads</span>
            <span className="text-sm font-serif font-medium text-bf-rosegold-flat">{myPhotoCount}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
