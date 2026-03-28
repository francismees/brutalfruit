"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export function Modal({
  isOpen,
  onClose,
  children,
  className,
  title,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      window.addEventListener("keydown", handleEscape);
    }
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-bf-overlay animate-fade-in-up" style={{ animationDuration: "0.2s" }} />

      {/* Content */}
      <div
        className={cn(
          "relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 animate-fade-in-up",
          className
        )}
        style={{ animationDuration: "0.3s", animationDelay: "0.05s" }}
      >
        {title && (
          <h2 className="heading-display text-xl mb-4">{title}</h2>
        )}
        {children}
      </div>
    </div>
  );
}
