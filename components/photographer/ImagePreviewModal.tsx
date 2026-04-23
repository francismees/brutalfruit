"use client";

import Image from "next/image";
import { formatDate, formatFileSize } from "@/lib/utils";
import type { GalleryImage, Photographer } from "@/types";

interface ImagePreviewModalProps {
  image: GalleryImage | null;
  photographers: Photographer[];
  onClose: () => void;
  onDownload: (image: GalleryImage) => void;
  onDelete: (image: GalleryImage) => void;
  onSetCover?: (image: GalleryImage) => void;
  currentUserId: string;
  isAdmin?: boolean;
}

export function ImagePreviewModal({
  image,
  photographers,
  onClose,
  onDownload,
  onDelete,
  onSetCover,
  currentUserId,
  isAdmin = false
}: ImagePreviewModalProps) {
  if (!image) return null;

  const photographer = photographers.find(p => p.id === image.uploaded_by);
  const isOwn = image.uploaded_by === currentUserId || isAdmin;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bf-black/95 backdrop-blur-md p-4 md:p-10 animate-in fade-in duration-300">
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center z-[110]"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="relative w-full h-full flex flex-col md:flex-row gap-8 max-w-7xl mx-auto">
        {/* Media Display */}
        <div className="flex-1 relative bg-bf-black rounded-3xl overflow-hidden group flex items-center justify-center">
          {image.media_type === "video" ? (
            <video
              src={image.storage_path.startsWith('http') ? image.storage_path : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/event-photos/${image.storage_path}`}
              controls
              autoPlay
              playsInline
              className="max-w-full max-h-[80vh] object-contain"
            />
          ) : (
            <Image
              src={image.storage_path.startsWith('http') ? image.storage_path : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/event-photos/${image.storage_path}`}
              alt={image.filename}
              fill
              className="object-contain"
              priority
            />
          )}
        </div>

        {/* Info Sidebar */}
        <div className="w-full md:w-80 flex flex-col justify-between py-2 text-white">
          <div className="space-y-8">
            <div>
              <p className="label-ui text-bf-rosegold-flat text-[0.65rem] mb-2 font-bold tracking-widest uppercase">Asset Information</p>
              <h2 className="heading-display text-2xl mb-4 break-all">{image.filename}</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <span className="text-[0.6rem] text-bf-gray-400 font-sans uppercase">Dimension</span>
                  <span className="text-sm font-serif">{image.width ?? '--'} × {image.height ?? '--'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[0.6rem] text-bf-gray-400 font-sans uppercase">Size</span>
                  <span className="text-sm font-serif">{image.file_size ? formatFileSize(image.file_size) : '--'}</span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <p className="label-ui text-bf-gray-400 text-[0.6rem] mb-2 uppercase">Uploaded By</p>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold font-sans text-sm ${
                  isOwn ? "bg-bf-rosegold-flat" : "bg-white/20"
                }`}>
                  {photographer?.display_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || "??"}
                </div>
                <div>
                  <p className="font-serif font-medium">{photographer?.display_name || "Unknown Photographer"}</p>
                  <p className="text-[0.65rem] text-bf-gray-400 font-sans">{image.created_at ? formatDate(image.created_at) : 'Date Unknown'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 mt-10">
            <button
              onClick={() => onDownload(image)}
              className="w-full py-4 bg-white text-bf-black rounded-2xl font-sans font-bold hover:bg-bf-cream transition-colors flex items-center justify-center gap-3"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              DOWNLOAD ORIGINAL
            </button>

            {onSetCover && (
              <button
                onClick={() => onSetCover(image)}
                className="w-full py-4 bg-white/10 text-white border border-white/20 rounded-2xl font-sans font-bold hover:bg-white/20 transition-all flex items-center justify-center gap-3"
              >
                SET AS COVER
              </button>
            )}

            {isOwn && (
              <button
                onClick={() => onDelete(image)}
                className="w-full py-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl font-sans font-bold hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-3"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                DELETE ASSET
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
