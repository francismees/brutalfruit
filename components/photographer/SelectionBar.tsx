"use client";

interface ImageActionBarProps {
  selectedCount: number;
  totalSelected: number;
  onDelete: () => void;
  onDownload: () => void;
  onClear: () => void;
  isDeleting?: boolean;
}

export function ImageActionBar({
  selectedCount,
  onDelete,
  onDownload,
  onClear,
  isDeleting
}: ImageActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-bf-black text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-8 border border-white/10 backdrop-blur-md">
        <div className="flex flex-col">
          <span className="text-[0.6rem] font-sans text-bf-gray-400 uppercase tracking-widest font-bold">Selection</span>
          <span className="text-sm font-serif">
            {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
          </span>
        </div>

        <div className="h-8 w-px bg-white/10" />

        <div className="flex items-center gap-3">
          <button
            onClick={onDownload}
            className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-white/10 transition-colors text-sm font-sans"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Download
          </button>

          <div className="relative group">
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors text-sm font-sans ${
                isDeleting
                  ? "opacity-40 cursor-not-allowed text-bf-gray-400"
                  : "bg-bf-ruby text-white hover:bg-bf-ruby/90"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {isDeleting ? "Deleting..." : `Delete (${selectedCount})`}
            </button>
          </div>
        </div>

        <div className="h-8 w-px bg-white/10" />

        <button
          onClick={onClear}
          className="text-[0.65rem] font-sans font-bold text-bf-gray-400 hover:text-white transition-colors tracking-widest uppercase"
        >
          Deselect All ×
        </button>
      </div>
    </div>
  );
}
