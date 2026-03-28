import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { getThumbnailUrl } from "@/lib/image-loader";
import type { Album } from "@/types";

interface AlbumCardProps {
  album: Album;
  isLatest?: boolean;
  index: number;
}

export function AlbumCard({ album, isLatest, index }: AlbumCardProps) {
  const coverUrl = album.cover_image_url
    ? getThumbnailUrl(album.cover_image_url, 800, 80)
    : null;

  return (
    <Link
      href={`/gallery/${album.slug}`}
      className="group block rounded-2xl overflow-hidden bg-bf-card shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-fade-in-up"
      style={{ animationDelay: `${index * 0.08}s` }}
      id={`album-card-${album.slug}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={album.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-bf-cream to-bf-gray-200 flex items-center justify-center">
            <span className="text-bf-gray-400 font-serif italic text-lg">No cover image</span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Most recent badge */}
        {isLatest && (
          <div className="absolute top-3 left-3">
            <Badge variant="rosegold">★ Most Recent</Badge>
          </div>
        )}

        {/* Album info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          {album.event_date && (
            <p className="label-ui text-white/70 text-[0.65rem] mb-1">
              {formatDate(album.event_date)}
            </p>
          )}
          <h3 className="heading-display-italic text-white text-xl md:text-2xl">
            {album.name}
          </h3>
          <span className="label-ui text-white/60 text-[0.6rem] mt-2 inline-block">
            VIEW GALLERY
          </span>
        </div>
      </div>
    </Link>
  );
}
