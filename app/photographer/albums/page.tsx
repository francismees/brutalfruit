"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AlbumCard } from "@/components/photographer/AlbumCard";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Album } from "@/types";

interface AlbumStats {
  album_id: string;
  total_count: number;
  my_count: number;
}

export default function PhotographerAlbumsPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [stats, setStats] = useState<Record<string, { total: number; my: number }>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const isAdmin = user.user_metadata?.role === "admin";
      let albumIds: string[] = [];

      if (isAdmin) {
        // Admin gets all albums
        const { data: allAlbums } = await supabase
          .from("albums")
          .select("id")
          .order("created_at", { ascending: false });
        if (allAlbums) albumIds = allAlbums.map((a) => a.id);
      } else {
        // 1. Get assigned albums
        const { data: assignments } = await supabase
          .from("album_photographers")
          .select("album_id")
          .eq("photographer_id", user.id);

        if (assignments) {
          albumIds = assignments.map((a) => a.album_id);
        }
      }

      if (albumIds.length === 0) {
        setIsLoading(false);
        return;
      }

      // 2. Fetch full album details
      const { data: albumData } = await supabase
        .from("albums")
        .select("*")
        .in("id", albumIds)
        .order("created_at", { ascending: false });

      if (albumData) setAlbums(albumData);

      // 3. Aggregate stats (Total photos vs My photos)
      // This is a bit heavy but accurate for a management view
      const { data: imageData } = await supabase
        .from("images")
        .select("album_id, uploaded_by")
        .in("album_id", albumIds);

      if (imageData) {
        const statsMap: Record<string, { total: number; my: number }> = {};
        albumIds.forEach(id => statsMap[id] = { total: 0, my: 0 });

        imageData.forEach(img => {
          if (statsMap[img.album_id]) {
            statsMap[img.album_id].total++;
            if (img.uploaded_by === user.id) {
              statsMap[img.album_id].my++;
            }
          }
        });
        setStats(statsMap);
      }

      setIsLoading(false);
    }

    fetchData();
  }, []);

  return (
    <div className="flex-1 overflow-y-auto bg-bf-cream/30">
      <header className="flex items-center justify-between px-6 lg:px-8 py-5 border-b border-bf-gray-200 bg-white">
        <h2 className="label-ui text-bf-gray-700 tracking-wider font-bold">PHOTO ALBUMS</h2>
        <div className="flex items-center gap-4">
          <span className="label-ui text-bf-gray-400">Collaborative Mode</span>
        </div>
      </header>

      <div className="px-6 lg:px-8 py-10 max-w-7xl mx-auto">
        <div className="mb-10 max-w-2xl">
          <h1 className="heading-display text-4xl mb-3">
            Your <em className="heading-display-italic">Assignments</em>
          </h1>
          <p className="text-editorial text-bf-text-secondary">
            Manage your photographic contributions and curate the visual flow for each event. Any assigned photographer can reorder photos for the final gallery experience.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="aspect-[4/3] w-full rounded-2xl h-[400px]" />
            ))}
          </div>
        ) : albums.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 border border-bf-gray-200 text-center">
            <div className="w-16 h-16 bg-bf-cream rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--bf-gray-300)" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <path d="M15 13l-3 3m0 0l-3-3m3 3V8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="heading-display text-2xl mb-2">No active assignments</h3>
            <p className="text-label-ui text-bf-gray-400 max-w-sm mx-auto">
              Please reach out to the administrator to be assigned to an event album.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {albums.map((album) => (
              <AlbumCard
                key={album.id}
                album={album}
                photoCount={stats[album.id]?.total || 0}
                myPhotoCount={stats[album.id]?.my || 0}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
