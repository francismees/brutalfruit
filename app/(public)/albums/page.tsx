"use client";

import { useAlbums } from "@/hooks/useAlbums";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AlbumCard } from "../components/AlbumCard";
import { BottomNav } from "../components/BottomNav";
import { BrandLogo } from "@/components/BrandLogo";
import { Footer } from "@/components/Footer";
import { Skeleton } from "@/components/ui/Skeleton";

export default function AlbumsPage() {
  const { albums, isLoading, error } = useAlbums();
  const router = useRouter();

  // Single album auto-redirect
  useEffect(() => {
    if (!isLoading && albums.length === 1) {
      router.replace(`/gallery/${albums[0].slug}`);
    }
  }, [albums, isLoading, router]);

  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-0">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 sticky top-0 z-30 bg-bf-blush/90 backdrop-blur-sm">
        <button className="w-8 h-8 flex items-center justify-center text-bf-black">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <BrandLogo
          variant="wordmark"
          width={100}
          height={16}
          className="opacity-80"
        />
        <button className="w-8 h-8 flex items-center justify-center text-bf-black">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      {/* Title section */}
      <section className="px-6 pt-4 pb-6 text-center">
        <p className="label-ui text-bf-gray-400 mb-1">THE GALLERY</p>
        <h1 className="heading-display text-3xl md:text-5xl">Our Moments</h1>
      </section>

      {/* Album grid */}
      <main className="px-5 pb-8">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="w-full aspect-[4/3] rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-bf-ruby text-editorial">Unable to load albums.</p>
            <p className="text-bf-gray-400 text-sm mt-2 font-sans">{error}</p>
          </div>
        ) : albums.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-editorial text-bf-gray-400 text-lg italic">
              No events to show yet. Check back soon.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {albums.map((album, index) => (
              <AlbumCard
                key={album.id}
                album={album}
                isLatest={index === 0}
                index={index}
              />
            ))}
          </div>
        )}

        {/* Discover more */}
        {albums.length > 6 && (
          <div className="text-center py-8">
            <p className="label-ui text-bf-gray-400 mb-2">DISCOVER MORE</p>
            <button className="w-8 h-8 rounded-full border border-bf-gray-200 flex items-center justify-center mx-auto text-bf-gray-400 hover:border-bf-gray-400 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}
      </main>

      <Footer />
      <BottomNav albumCount={albums.length} />
    </div>
  );
}
