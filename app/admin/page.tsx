"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Toggle } from "@/components/ui/Toggle";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDateShort } from "@/lib/utils";
import Link from "next/link";
import type { Album } from "@/types";

export default function AdminDashboardPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [totalImages, setTotalImages] = useState(0);
  const [totalPhotographers, setTotalPhotographers] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const supabase = createClient();

      const [albumResult, imageResult, photographerResult] = await Promise.all([
        supabase.from("albums").select("*").order("event_date", { ascending: false }),
        supabase.from("images").select("id", { count: "exact", head: true }),
        supabase.from("photographers").select("id", { count: "exact", head: true }),
      ]);

      setAlbums(albumResult.data || []);
      setTotalImages(imageResult.count || 0);
      setTotalPhotographers(photographerResult.count || 0);
      setIsLoading(false);
    }
    fetchStats();
  }, []);

  const togglePublished = async (album: Album) => {
    const supabase = createClient();
    await supabase
      .from("albums")
      .update({ is_published: !album.is_published })
      .eq("id", album.id);

    setAlbums((prev) =>
      prev.map((a) =>
        a.id === album.id ? { ...a, is_published: !a.is_published } : a
      )
    );
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <Skeleton className="w-64 h-8 mb-6" />
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="w-full h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex-1">
      {/* Header */}
      <header className="flex items-center justify-between px-6 lg:px-8 py-5 border-b border-bf-gray-200 bg-white">
        <div>
          <span className="heading-display-italic text-sm text-bf-gray-400">Overview</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="label-ui text-bf-gray-400 text-xs">Overview</span>
          <span className="label-ui text-bf-gray-400 text-xs">Analytics</span>
          <span className="label-ui text-bf-gray-400 text-xs">Settings</span>
        </div>
      </header>

      <div className="px-6 lg:px-8 py-8">
        {/* Title */}
        <h1 className="heading-display text-3xl md:text-4xl mb-2">
          The <em className="heading-display-italic">Golden Hour</em> Dashboard
        </h1>
        <p className="text-editorial text-bf-text-secondary mb-8">
          Managing the glow of lifestyle photography across the continent.
        </p>

        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="bg-white rounded-xl border border-bf-gray-200/50 p-6 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-bf-cream flex items-center justify-center mb-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--bf-rosegold-flat)" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18" />
              </svg>
            </div>
            <p className="label-ui text-bf-gray-400 text-[0.65rem]">TOTAL ALBUMS</p>
            <p className="text-4xl font-sans font-light mt-1">{albums.length}</p>
          </div>

          <div className="bg-white rounded-xl border border-bf-gray-200/50 p-6 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-bf-cream flex items-center justify-center mb-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--bf-rosegold-flat)" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
            <p className="label-ui text-bf-gray-400 text-[0.65rem]">TOTAL IMAGES</p>
            <p className="text-4xl font-sans font-light mt-1">{totalImages.toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-xl border border-bf-gray-200/50 p-6 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-bf-cream flex items-center justify-center mb-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--bf-rosegold-flat)" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
            </div>
            <p className="label-ui text-bf-gray-400 text-[0.65rem]">ACTIVE PHOTOGRAPHERS</p>
            <p className="text-4xl font-sans font-light mt-1">{String(totalPhotographers).padStart(2, "0")}</p>
          </div>
        </div>

        {/* Album management */}
        <div className="bg-white rounded-xl border border-bf-gray-200/50 shadow-sm">
          <div className="flex items-center justify-between px-6 py-5 border-b border-bf-gray-200">
            <h2 className="heading-display-italic text-xl">Album Management</h2>
            <Link href="/admin/albums" className="btn-ruby text-xs">
              + CREATE NEW ALBUM
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-bf-gray-200">
                  <th className="text-left label-ui text-bf-gray-400 text-[0.65rem] px-6 py-3">ALBUM NAME</th>
                  <th className="text-left label-ui text-bf-gray-400 text-[0.65rem] px-6 py-3 hidden md:table-cell">EVENT DATE</th>
                  <th className="text-left label-ui text-bf-gray-400 text-[0.65rem] px-6 py-3 hidden md:table-cell">IMAGES</th>
                  <th className="text-left label-ui text-bf-gray-400 text-[0.65rem] px-6 py-3">STATUS</th>
                  <th className="text-left label-ui text-bf-gray-400 text-[0.65rem] px-6 py-3">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {albums.map((album) => (
                  <tr key={album.id} className="border-b border-bf-gray-200/50 hover:bg-bf-cream/30 transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/albums/${album.id}`}
                        className="font-serif font-medium hover:text-bf-rosegold-flat transition-colors"
                      >
                        {album.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm font-sans text-bf-gray-400 hidden md:table-cell">
                      {album.event_date ? formatDateShort(album.event_date) : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm font-sans hidden md:table-cell">—</td>
                    <td className="px-6 py-4">
                      <Toggle
                        checked={album.is_published}
                        onChange={() => togglePublished(album)}
                        label={album.is_published ? "PUBLISHED" : "DRAFT"}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/albums/${album.id}`}
                        className="label-ui text-bf-gray-400 text-xs hover:text-bf-black"
                      >
                        ⋮
                      </Link>
                    </td>
                  </tr>
                ))}
                {albums.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-bf-gray-400 italic font-serif">
                      No albums yet. Create your first event.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
