"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/Skeleton";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { formatDateShort } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import type { Album } from "@/types";

export default function AdminDashboardPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [totalImages, setTotalImages] = useState(0);
  const [totalPhotographers, setTotalPhotographers] = useState(0);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const supabase = createClient();

      const [albumResult, imageCountResult, photographerResult] = await Promise.all([
        supabase.from("albums").select("*").order("event_date", { ascending: false }).limit(3),
        supabase.from("images").select("id", { count: "exact", head: true }),
        supabase.from("photographers").select("id", { count: "exact", head: true }),
      ]);

      setAlbums(albumResult.data || []);
      setTotalImages(imageCountResult.count || 0);
      setTotalPhotographers(photographerResult.count || 0);
      setIsLoading(false);
    }
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="p-8">
        <Skeleton className="w-64 h-8 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="w-full h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 max-w-[1360px]">
      <PageHeader
        title="Dashboard"
        subtitle="At-a-glance overview of your editorial operation."
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" />
            </svg>
          }
          label="Total Albums"
          value={albums.length}
        />
        <StatCard
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
              <polygon points="16 3 14 8 19 8" fill="currentColor" stroke="none" opacity="0.5"/>
            </svg>
          }
          label="Total Media"
          value={totalImages.toLocaleString()}
        />
        <StatCard
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
          }
          label="Active Photographers"
          value={String(totalPhotographers).padStart(2, "0")}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Albums */}
        <div className="bg-white rounded-xl border border-bf-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="heading-display text-lg">Recent Albums</h2>
            <Link href="/admin/studio" className="text-xs font-sans text-bf-rosegold-flat hover:underline">
              View all in Studio →
            </Link>
          </div>
          <div className="space-y-3">
            {albums.map((album) => (
              <div key={album.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-bf-cream/50 transition-colors">
                {album.cover_image_url ? (
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-bf-cream shrink-0 relative">
                    <Image
                      src={
                        album.cover_image_url.startsWith("http")
                          ? album.cover_image_url
                          : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/event-photos/${album.cover_image_url}`
                      }
                      alt=""
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-bf-cream shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-serif text-sm truncate">{album.name}</p>
                  <p className="text-xs font-sans text-bf-gray-400">
                    {album.event_date ? formatDateShort(album.event_date) : "No date"} · {album.is_published ? "Published" : "Draft"}
                  </p>
                </div>
              </div>
            ))}
            {albums.length === 0 && (
              <p className="text-editorial text-bf-gray-400 italic text-center py-6">No albums yet.</p>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-xl border border-bf-gray-200 p-6">
          <h2 className="heading-display text-lg mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              href="/admin/studio"
              className="flex items-center gap-3 p-3 rounded-lg border border-bf-gray-200 hover:border-bf-ruby hover:bg-bf-cream/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-bf-cream flex items-center justify-center text-bf-ruby shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="font-sans text-sm font-medium">Go to Studio</p>
                <p className="text-xs font-sans text-bf-gray-400">Manage albums and photographers</p>
              </div>
            </Link>
            <Link
              href="/admin/uploads"
              className="flex items-center gap-3 p-3 rounded-lg border border-bf-gray-200 hover:border-bf-ruby hover:bg-bf-cream/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-bf-cream flex items-center justify-center text-bf-ruby shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="font-sans text-sm font-medium">Go to Uploads</p>
                <p className="text-xs font-sans text-bf-gray-400">Upload photos to an album</p>
              </div>
            </Link>
            <Link
              href="/admin/photo-albums"
              className="flex items-center gap-3 p-3 rounded-lg border border-bf-gray-200 hover:border-bf-ruby hover:bg-bf-cream/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-bf-cream flex items-center justify-center text-bf-ruby shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 19.5A2.5 2.5 0 016.5 17H20" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="font-sans text-sm font-medium">Photo Albums</p>
                <p className="text-xs font-sans text-bf-gray-400">Browse and open event albums</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
