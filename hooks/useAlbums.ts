"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Album } from "@/types";

export function useAlbums() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAlbums() {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("albums")
        .select("*")
        .eq("is_published", true)
        .order("event_date", { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setAlbums(data || []);
      }
      setIsLoading(false);
    }

    fetchAlbums();
  }, []);

  return { albums, isLoading, error };
}
