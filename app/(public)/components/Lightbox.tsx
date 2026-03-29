"use client";

import { useEffect, useCallback, useState } from "react";
import Image from "next/image";
import { getThumbnailUrl, getPublicUrl } from "@/lib/image-loader";
import type { GalleryImage } from "@/types";
import { useTrackImageEvent } from "@/hooks/useTrackImageEvent";

interface LightboxProps {
  images: GalleryImage[];
  initialIndex: number;
  totalCount: number;
  isOpen: boolean;
  onClose: () => void;
}

export function Lightbox({
  images,
  initialIndex,
  totalCount,
  isOpen,
  onClose,
}: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : prev));
  }, [images.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose, goNext, goPrev]);

  // Touch swipe
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = e.changedTouches[0].clientX - touchStart;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goPrev();
      else goNext();
    }
    setTouchStart(null);
  };

  const track = useTrackImageEvent();

  const handleDownload = async () => {
    const image = images[currentIndex];
    if (!image) return;

    track(image.id, image.album_id, 'download');
    
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/download?path=${encodeURIComponent(image.storage_path)}&filename=${encodeURIComponent(image.filename)}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = image.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen || !images[currentIndex]) return null;

  const currentImage = images[currentIndex];
  const swipeUrl = getThumbnailUrl(currentImage.storage_path, 1200, 85);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-bf-overlay" onClick={onClose} />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-5 py-4">
        <span className="text-white/80 font-sans text-sm tabular-nums">
          {currentIndex + 1} / {totalCount}
        </span>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          id="lightbox-close"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Image */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4">
        {/* Prev arrow */}
        {currentIndex > 0 && (
          <button
            onClick={goPrev}
            className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-20"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}

        <div className="relative w-full max-w-4xl aspect-[4/3] md:aspect-auto md:h-[70vh]">
          <Image
            key={currentImage.id}
            src={swipeUrl}
            alt={currentImage.filename}
            fill
            sizes="100vw"
            className="object-contain"
            priority
          />
        </div>

        {/* Next arrow */}
        {currentIndex < images.length - 1 && (
          <button
            onClick={goNext}
            className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-20"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Download button — the most important UI element */}
      <div className="relative z-10 flex justify-center py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="btn-gradient px-8 py-4 text-base shadow-lg shadow-bf-rosegold-flat/30 disabled:opacity-70"
          id="lightbox-download"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3v13m0 0l-4-4m4 4l4-4M5 19h14" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {isDownloading ? "DOWNLOADING..." : "DOWNLOAD IMAGE"}
        </button>
      </div>
    </div>
  );
}
