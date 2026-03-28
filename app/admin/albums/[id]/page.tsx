"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getThumbnailUrl } from "@/lib/image-loader";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import Image from "next/image";
import type { Album, GalleryImage } from "@/types";

export default function AlbumDetailPage() {
  const params = useParams();
  const albumId = params.id as string;

  const [album, setAlbum] = useState<Album | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    const supabase = createClient();
    const [albumRes, imagesRes] = await Promise.all([
      supabase.from("albums").select("*").eq("id", albumId).single(),
      supabase.from("images").select("*").eq("album_id", albumId).order("created_at", { ascending: false }),
    ]);
    setAlbum(albumRes.data);
    setImages(imagesRes.data || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, [albumId]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === images.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(images.map((i) => i.id)));
    }
  };

  const deleteSelected = async () => {
    if (!confirm(`Delete ${selected.size} image(s)?`)) return;
    const supabase = createClient();
    const ids = Array.from(selected);

    // Delete storage files
    const pathsToDelete = images
      .filter((i) => ids.includes(i.id))
      .flatMap((i) => [i.storage_path, i.thumbnail_path].filter(Boolean) as string[]);

    await supabase.storage.from("event-photos").remove(pathsToDelete);
    await supabase.from("images").delete().in("id", ids);

    setSelected(new Set());
    fetchData();
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <Skeleton className="w-48 h-8 mb-4" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <header className="flex items-center justify-between px-6 lg:px-8 py-5 border-b border-bf-gray-200 bg-white">
        <h1 className="heading-display text-2xl">{album?.name || "Album"}</h1>
        <div className="flex items-center gap-3">
          {selected.size > 0 && (
            <Button variant="ruby" onClick={deleteSelected} className="text-xs">
              Delete {selected.size} Selected
            </Button>
          )}
          <button onClick={selectAll} className="label-ui text-xs text-bf-gray-400 hover:text-bf-black">
            {selected.size === images.length ? "Deselect All" : "Select All"}
          </button>
        </div>
      </header>

      <div className="px-6 lg:px-8 py-8">
        <p className="text-sm text-bf-gray-400 font-sans mb-6">{images.length} images</p>

        {images.length === 0 ? (
          <p className="text-editorial text-bf-gray-400 italic text-center py-16">
            No images in this album yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {images.map((image) => (
              <button
                key={image.id}
                onClick={() => toggleSelect(image.id)}
                className={`relative aspect-square rounded-lg overflow-hidden bg-bf-cream group ${
                  selected.has(image.id) ? "ring-3 ring-bf-rosegold-flat" : ""
                }`}
              >
                <div className="relative aspect-square rounded-lg bg-bf-cream overflow-hidden">
                  <Image
                    src={getThumbnailUrl(image.thumbnail_path || image.storage_path, 300, 75)}
                    alt={image.filename}
                    fill
                    sizes="(max-width: 640px) 50vw, 300px"
                    className="object-cover"
                  />
                </div>
                {selected.has(image.id) && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-rosegold flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
