"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ImageGrid } from "@/components/photographer/ImageGrid";
import { ReorderGrid } from "@/components/photographer/ReorderGrid";
import { ImageActionBar } from "@/components/photographer/SelectionBar";
import { ImagePreviewModal } from "@/components/photographer/ImagePreviewModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Skeleton } from "@/components/ui/Skeleton";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { Album, GalleryImage, Photographer } from "@/types";

export default function AlbumManagementPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [album, setAlbum] = useState<Album | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [hasUnsavedOrder, setHasUnsavedOrder] = useState(false);
  
  const [filter, setFilter] = useState<"all" | "images" | "videos" | "mine" | string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewImage, setPreviewImage] = useState<GalleryImage | null>(null);
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    
    // Auth & Profile
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUser(user);
    setIsAdmin(user.app_metadata?.role === "admin");

    // Album Data
    const { data: albumData } = await supabase
      .from("albums")
      .select("*")
      .eq("slug", slug)
      .single();

    if (!albumData) {
      router.push("/photographer/albums");
      return;
    }
    setAlbum(albumData);

    // Images
    const { data: imageData } = await supabase
      .from("images")
      .select("*")
      .eq("album_id", albumData.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (imageData) setImages(imageData);

    // Photographers (for filtering/badges)
    const { data: photographerData } = await supabase
      .from("photographers")
      .select("*")
      .eq("is_active", true);
    
    if (photographerData) setPhotographers(photographerData);

    setIsLoading(false);
  }, [slug, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived States
  const filteredImages = useMemo(() => {
    if (filter === "all") return images;
    if (filter === "mine") return images.filter(img => img.uploaded_by === currentUser?.id);
    if (filter === "images") return images.filter(img => !img.media_type || img.media_type === "image");
    if (filter === "videos") return images.filter(img => img.media_type === "video");
    return images.filter(img => img.uploaded_by === filter);
  }, [images, filter, currentUser]);

  const ownSelectedCount = selectedIds.size;

  // Handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    setSelectedIds(new Set(filteredImages.map(img => img.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = () => {
    setIsDeletingSelected(true);
  };

  const executeDeleteSelected = async () => {
    const supabase = createClient();
    const toDelete = images.filter(img => selectedIds.has(img.id));
    
    // 1. Storage Deletion — remove main file, image thumbnail, AND video thumbnail
    const paths = toDelete.map(img => img.storage_path);
    const thumbPaths = toDelete.map(img => img.thumbnail_path).filter(Boolean) as string[];
    const videoThumbPaths = toDelete.map(img => img.video_thumbnail_path).filter(Boolean) as string[];
    
    if (paths.length > 0) {
      await supabase.storage.from("event-photos").remove([...paths, ...thumbPaths, ...videoThumbPaths]);
    }

    // 2. Database Deletion
    const { error } = await supabase
      .from("images")
      .delete()
      .in("id", toDelete.map(img => img.id));

    if (!error) {
      setImages(prev => prev.filter(img => !toDelete.find(td => td.id === img.id)));
      setSelectedIds(new Set());
    }
    
    setIsDeletingSelected(false);
  };

  const handleDownloadSelected = async () => {
    const toDownload = images.filter(img => selectedIds.has(img.id));
    if (toDownload.length === 0) return;

    if (toDownload.length === 1) {
      const response = await fetch(toDownload[0].storage_path);
      const blob = await response.blob();
      saveAs(blob, toDownload[0].filename);
      return;
    }

    const zip = new JSZip();
    const folder = zip.folder(album?.name || "gallery");

    await Promise.all(
      toDownload.map(async (img) => {
        const response = await fetch(img.storage_path);
        const blob = await response.blob();
        folder?.file(img.filename, blob);
      })
    );

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${album?.slug || "gallery"}-selection.zip`);
  };

  const handleSetCover = async (image: GalleryImage) => {
    if (!album) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("albums")
      .update({ cover_image_url: image.storage_path })
      .eq("id", album.id);

    if (!error) {
      setAlbum({ ...album, cover_image_url: image.storage_path });
      setPreviewImage(null);
    } else {
      alert("Failed to set album cover. Check permissions.");
    }
  };

  const handleOrderChange = (newOrder: GalleryImage[]) => {
    setImages(newOrder);
    setHasUnsavedOrder(true);
  };

  const handleSaveOrder = async () => {
    setIsSavingOrder(true);
    const supabase = createClient();

    // Map new sort_order (batch update)
    const updates = images.map((img, idx) => ({
      id: img.id,
      sort_order: idx,
    }));

    const { error } = await supabase
      .from("images")
      .upsert(updates, { onConflict: "id" });

    if (!error) {
      setHasUnsavedOrder(false);
      setIsReorderMode(false);
    } else {
      alert("Failed to save new sequence. Please check your permissions.");
    }
    setIsSavingOrder(false);
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-8">
        <Skeleton className="w-64 h-8 mb-4" />
        <Skeleton className="w-full h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-bf-cream/20 flex flex-col">
      {/* Tab Header */}
      <header className="flex items-center justify-between px-6 lg:px-8 py-5 border-b border-bf-gray-200 bg-white sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push("/photographer/albums")}
            className="w-10 h-10 rounded-full hover:bg-bf-cream flex items-center justify-center transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5m0 0l7 7m-7-7l7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div>
            <p className="text-[0.6rem] font-sans font-bold text-bf-gray-400 uppercase tracking-widest">{album?.name}</p>
            <h2 className="heading-display text-xl leading-none">Management Center</h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isReorderMode ? (
            <>
               <span className="text-[0.65rem] font-sans font-bold text-bf-rosegold-flat animate-pulse mr-2">
                 {hasUnsavedOrder ? "UNSAVED CHANGES" : "REORDER MODE"}
               </span>
               <button 
                onClick={() => { setIsReorderMode(false); fetchData(); }}
                className="px-6 py-2.5 rounded-xl text-sm font-sans font-bold text-bf-gray-400 hover:text-bf-black transition-colors"
               >
                 Cancel
               </button>
               <button 
                onClick={handleSaveOrder}
                disabled={!hasUnsavedOrder || isSavingOrder}
                className="px-6 py-2.5 rounded-xl text-sm font-sans font-bold bg-bf-black text-white hover:bg-bf-black/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
               >
                 {isSavingOrder ? "Saving..." : "Save New Sequence"}
               </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => setIsReorderMode(true)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-sans font-bold border border-bf-gray-200 hover:border-bf-black transition-all"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <circle cx="12" cy="16" r="1" />
                </svg>
                Curate Sequence
              </button>
            </>
          )}
        </div>
      </header>

      <div className="flex-1 px-6 lg:px-8 py-8">
        {!isReorderMode && (
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-wrap items-center gap-2">
              <button 
                onClick={() => setFilter("all")}
                className={`px-4 py-2 rounded-full text-xs font-sans font-bold transition-all border ${
                  filter === "all" ? "bg-bf-black text-white border-bf-black" : "bg-white text-bf-gray-400 border-bf-gray-200 hover:border-bf-gray-400"
                }`}
              >
                All Media ({images.length})
              </button>
              <button 
                onClick={() => setFilter("images")}
                className={`px-4 py-2 rounded-full text-xs font-sans font-bold transition-all border ${
                  filter === "images" ? "bg-bf-black text-white border-bf-black" : "bg-white text-bf-gray-400 border-bf-gray-200 hover:border-bf-gray-400"
                }`}
              >
                Images ({images.filter(i => !i.media_type || i.media_type === "image").length})
              </button>
              <button 
                onClick={() => setFilter("videos")}
                className={`px-4 py-2 rounded-full text-xs font-sans font-bold transition-all border ${
                  filter === "videos" ? "bg-bf-ruby text-white border-bf-ruby" : "bg-white text-bf-gray-400 border-bf-gray-200 hover:border-bf-ruby/50"
                }`}
              >
                Videos ({images.filter(i => i.media_type === "video").length})
              </button>
              <button 
                onClick={() => setFilter("mine")}
                className={`px-4 py-2 rounded-full text-xs font-sans font-bold transition-all border ${
                  filter === "mine" ? "bg-bf-pink text-white border-bf-pink" : "bg-white text-bf-gray-400 border-bf-gray-200 hover:border-bf-pink/50"
                }`}
              >
                My Uploads
              </button>
              
              <div className="w-px h-6 bg-bf-gray-200 mx-1" />
              
              <select 
                value={filter.includes('-') ? filter : "all"}
                onChange={(e) => setFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-bf-gray-200 rounded-full text-xs font-sans focus:outline-none"
              >
                <option value="all">Filter by Photographer</option>
                {photographers.map(p => (
                  <option key={p.id} value={p.id}>{p.display_name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <p className="text-[0.65rem] font-sans font-bold text-bf-gray-400 uppercase tracking-widest">
                Showing {filteredImages.length} result{filteredImages.length !== 1 ? 's' : ''}
              </p>
              <div className="w-px h-4 bg-bf-gray-200" />
              <button 
                onClick={selectedIds.size > 0 ? handleDeselectAll : handleSelectAllVisible}
                className="text-[0.65rem] font-sans font-bold text-bf-rosegold-flat hover:underline uppercase"
              >
                {selectedIds.size > 0 ? "DESELECT ALL" : "SELECT ALL VISIBLE"}
              </button>
            </div>
          </div>
        )}

        {isReorderMode ? (
          <div className="bg-white/50 rounded-3xl p-8 border-2 border-dashed border-bf-gray-200 min-h-[400px]">
            <div className="mb-6 text-center max-w-md mx-auto">
              <h3 className="heading-display text-2xl mb-1">Curation Mode Active</h3>
              <p className="text-[0.65rem] font-sans text-bf-gray-400 uppercase tracking-widest font-bold">Drag and drop to set the gallery sequence</p>
            </div>
            <ReorderGrid images={images} onOrderChange={handleOrderChange} />
          </div>
        ) : (
          <ImageGrid 
            images={filteredImages}
            photographers={photographers}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onPreview={setPreviewImage}
            currentUserId={currentUser?.id}
          />
        )}
      </div>

      <ImageActionBar 
        selectedCount={selectedIds.size}
        totalSelected={selectedIds.size}
        onDelete={handleDeleteSelected}
        onDownload={handleDownloadSelected}
        onClear={handleDeselectAll}
      />

      <ImagePreviewModal 
        image={previewImage}
        photographers={photographers}
        onClose={() => setPreviewImage(null)}
        onDownload={(img) => {
           handleDownloadSelected();
           setPreviewImage(null);
        }}
        onDelete={(img) => {
           setSelectedIds(new Set([img.id]));
           handleDeleteSelected();
           setPreviewImage(null);
        }}
        onSetCover={handleSetCover}
        currentUserId={currentUser?.id}
        isAdmin={isAdmin}
      />

      <ConfirmModal
        isOpen={isDeletingSelected}
        onClose={() => setIsDeletingSelected(false)}
        onConfirm={executeDeleteSelected}
        title="Delete Selected Images"
        message={`Are you sure you want to permanently delete ${ownSelectedCount} selected image(s)? This action cannot be undone.`}
        confirmText="Delete Images"
      />
    </div>
  );
}
