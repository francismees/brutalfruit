"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useGallery } from "@/hooks/useGallery";
import { useAlbums } from "@/hooks/useAlbums";
import { ImageCard } from "../../components/ImageCard";
import { Lightbox } from "../../components/Lightbox";
import { BottomNav } from "../../components/BottomNav";
import { BrandLogo } from "@/components/BrandLogo";
import { Footer } from "@/components/Footer";
import { Skeleton } from "@/components/ui/Skeleton";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/lib/constants";

export default function GalleryPage() {
  const params = useParams();
  const slug = params.slug as string;

  const { albums } = useAlbums();
  const album = albums.find((a) => a.slug === slug);

  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const { images, totalCount, page, totalPages, setPage, isLoading } = useGallery({
    albumId: album?.id || "",
    pageSize,
  });

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-0">
      {/* Unified Header */}
      <header className="flex items-center justify-center px-5 py-5 sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-bf-gray-200">
        <div 
          className="w-36 md:w-48 h-6 md:h-8 bg-rosegold" 
          style={{ 
            WebkitMaskImage: 'url(/bf-logo-wordmark.svg)', 
            WebkitMaskSize: 'contain', 
            WebkitMaskRepeat: 'no-repeat', 
            WebkitMaskPosition: 'center',
            maskImage: 'url(/bf-logo-wordmark.svg)',
            maskSize: 'contain',
            maskRepeat: 'no-repeat',
            maskPosition: 'center',
          }} 
          title="Brutal Fruit"
        />
      </header>

      {/* Gallery header */}
      <section className="px-6 md:px-8 pt-8 pb-6 flex flex-col items-center text-center">
        <h1 className="heading-display-italic text-3xl md:text-5xl mb-3">
          {album ? album.name : "The Gallery"}
        </h1>
        {album?.event_date && (
          <p className="font-serif italic text-sm md:text-base text-transparent bg-clip-text bg-[image:var(--bf-rosegold)] mb-5 inline-block">
            {new Date(album.event_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        )}
        {album && (
          <p className="text-editorial text-bf-text-secondary max-w-lg whitespace-pre-line">
            {album.description || `A curated editorial of moments captured during ${album.name}. Elegant celebrations, sun-drenched landscapes, and the ruby sparkle of Brutal Fruit.`}
          </p>
        )}
      </section>

      {/* Image grid */}
      <main className="flex-1 px-5 md:px-8">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-editorial text-bf-gray-400 text-lg italic">
              No photos yet. Check back soon after the event.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {images.map((image, index) => (
              <ImageCard
                key={image.id}
                image={image}
                onClick={() => openLightbox(index)}
                index={index}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-8 mt-8 border-t border-bf-gray-200">
            <div className="flex items-center gap-3">
              <span className="label-ui text-bf-gray-400">SHOW</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="border border-bf-gray-200 rounded-lg px-3 py-1.5 text-sm font-sans bg-white focus:outline-none focus:ring-2 focus:ring-bf-rosegold-flat"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <span className="label-ui text-bf-gray-400">PER PAGE</span>
            </div>

            <p className="font-serif italic text-bf-text-secondary">
              Page <strong className="font-sans not-italic">{page}</strong>{" "}
              of <strong className="font-sans not-italic">{totalPages}</strong>
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="btn-outline py-2 px-5 text-xs disabled:opacity-40"
              >
                ← PREVIOUS
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="btn-gradient py-2 px-5 text-xs disabled:opacity-40"
              >
                NEXT →
              </button>
            </div>
          </div>
        )}
      </main>

      <Footer />
      <BottomNav albumCount={albums.length} />

      {/* Lightbox */}
      <Lightbox
        images={images}
        initialIndex={lightboxIndex}
        totalCount={totalCount}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}
