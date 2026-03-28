"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import type { GalleryImage } from "@/types";

interface UseGalleryOptions {
  albumId: string;
  pageSize?: number;
}

export function useGallery({ albumId, pageSize = DEFAULT_PAGE_SIZE }: UseGalleryOptions) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.ceil(totalCount / pageSize);

  const fetchImages = useCallback(async () => {
    setIsLoading(true);
    const supabase = createClient();

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error: fetchError, count } = await supabase
      .from("images")
      .select("*", { count: "exact" })
      .eq("album_id", albumId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .range(from, to);

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setImages(data || []);
      setTotalCount(count || 0);
    }
    setIsLoading(false);
  }, [albumId, page, pageSize]);

  useEffect(() => {
    if (albumId) {
      fetchImages();
    }
  }, [albumId, fetchImages]);

  return {
    images,
    totalCount,
    page,
    totalPages,
    setPage,
    isLoading,
    error,
    refetch: fetchImages,
  };
}
