"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { AlbumCard } from "@/components/photographer/AlbumCard";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { getPublicUrl } from "@/lib/image-loader";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { Album } from "@/types";

export function PhotoAlbumsPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [stats, setStats] = useState<Record<string, { total: number; my: number }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingAlbumId, setDownloadingAlbumId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number } | null>(null);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const isAdmin = user.app_metadata?.role === "admin";
      let albumIds: string[] = [];

      if (isAdmin) {
        const { data: allAlbums } = await supabase
          .from("albums")
          .select("id")
          .order("created_at", { ascending: false });
        if (allAlbums) albumIds = allAlbums.map((a) => a.id);
      } else {
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

      const { data: albumData } = await supabase
        .from("albums")
        .select("*")
        .in("id", albumIds)
        .order("created_at", { ascending: false });

      if (albumData) setAlbums(albumData);

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

  const handleDownloadAlbum = useCallback(async (album: Album) => {
    if (downloadingAlbumId) return;

    setDownloadingAlbumId(album.id);
    setDownloadProgress({ current: 0, total: 0 });

    try {
      const supabase = createClient();

      const { data: images, error } = await supabase
        .from("images")
        .select("storage_path, filename")
        .eq("album_id", album.id)
        .order("sort_order", { ascending: true });

      if (error || !images || images.length === 0) {
        alert("No images found in this album.");
        setDownloadingAlbumId(null);
        setDownloadProgress(null);
        return;
      }

      setDownloadProgress({ current: 0, total: images.length });

      const zip = new JSZip();
      const folder = zip.folder(album.name) || zip;

      const usedFilenames = new Map<string, number>();
      const BATCH_SIZE = 5;
      let completed = 0;

      for (let i = 0; i < images.length; i += BATCH_SIZE) {
        const batch = images.slice(i, i + BATCH_SIZE);

        await Promise.all(
          batch.map(async (img) => {
            try {
              const url = getPublicUrl(img.storage_path);
              const response = await fetch(url);
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              const blob = await response.blob();

              let filename = img.filename;
              const count = usedFilenames.get(filename) || 0;
              if (count > 0) {
                const ext = filename.lastIndexOf(".") > -1 ? filename.slice(filename.lastIndexOf(".")) : "";
                const base = filename.slice(0, filename.lastIndexOf(".") > -1 ? filename.lastIndexOf(".") : undefined);
                filename = `${base} (${count})${ext}`;
              }
              usedFilenames.set(img.filename, count + 1);

              folder.file(filename, blob);
            } catch (err) {
              console.warn(`Skipped ${img.filename}:`, err);
            } finally {
              completed++;
              setDownloadProgress({ current: completed, total: images.length });
            }
          })
        );
      }

      const content = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 1 },
      });

      saveAs(content, `${album.slug}.zip`);
    } catch (err) {
      console.error("Download failed:", err);
      alert("Download failed. Please try again.");
    } finally {
      setDownloadingAlbumId(null);
      setDownloadProgress(null);
    }
  }, [downloadingAlbumId]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-8 max-w-[1360px]">
        <PageHeader
          title="Photo Albums"
          subtitle="Browse and access event albums."
        />

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {albums.map((album) => (
              <AlbumCard
                key={album.id}
                album={album}
                photoCount={stats[album.id]?.total || 0}
                onDownload={handleDownloadAlbum}
                isDownloading={downloadingAlbumId === album.id}
                downloadProgress={downloadingAlbumId === album.id ? downloadProgress ?? undefined : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
