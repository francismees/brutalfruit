"use client";

import Link from "next/link";
import Image from "next/image";
import { formatDateShort } from "@/lib/utils";
import type { Album } from "@/types";

interface AlbumCardProps {
  album: Album;
  photoCount: number;

  onDownload?: (album: Album) => void;
  isDownloading?: boolean;
  downloadProgress?: { current: number; total: number };
}

export function AlbumCard({
  album,
  photoCount,

  onDownload,
  isDownloading,
  downloadProgress,
}: AlbumCardProps) {
  return (
    <div className="group relative bg-white rounded-2xl overflow-hidden border border-bf-gray-200 hover:border-bf-rosegold-flat transition-all hover:shadow-lg hover:shadow-bf-rosegold-flat/5 flex flex-col">
      <Link
        href={`/photographer/albums/${album.slug}`}
        className="flex flex-col flex-1"
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

          {/* Download progress overlay */}
          {isDownloading && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-10 animate-fade-in">
              <div className="w-10 h-10 mb-3 relative">
                <svg className="w-10 h-10 animate-spin" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                  <circle
                    cx="20" cy="20" r="16" fill="none" stroke="white" strokeWidth="3"
                    strokeDasharray={`${2 * Math.PI * 16}`}
                    strokeDashoffset={`${2 * Math.PI * 16 * (1 - (downloadProgress ? downloadProgress.current / downloadProgress.total : 0))}`}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 0.3s ease" }}
                    transform="rotate(-90 20 20)"
                  />
                </svg>
              </div>
              <p className="text-white text-xs font-sans font-bold tracking-wider uppercase">
                {downloadProgress
                  ? `${downloadProgress.current} / ${downloadProgress.total}`
                  : "Preparing…"}
              </p>
              <p className="text-white/60 text-[0.6rem] font-sans mt-1">
                Downloading album
              </p>
            </div>
          )}
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

          <div className="mt-auto pt-4 border-t border-bf-gray-100 flex items-center">
            <div className="flex flex-col">
              <span className="text-[0.65rem] font-sans text-bf-gray-400 uppercase tracking-tight">Total Photos</span>
              <span className="text-sm font-serif font-medium">{photoCount}</span>
            </div>
          </div>
        </div>
      </Link>

      {/* Download button — positioned outside the Link to avoid navigation */}
      {photoCount > 0 && (
        <button
          id={`download-album-${album.slug}`}
          onClick={(e) => {
            e.stopPropagation();
            if (!isDownloading && onDownload) onDownload(album);
          }}
          disabled={isDownloading}
          className="absolute bottom-4 right-4 w-9 h-9 rounded-full bg-white/90 backdrop-blur border border-bf-gray-200 flex items-center justify-center transition-all duration-200 hover:bg-bf-black hover:text-white hover:border-bf-black disabled:opacity-50 disabled:cursor-not-allowed z-20 shadow-sm"
          title={`Download all ${photoCount} photos as ZIP`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
