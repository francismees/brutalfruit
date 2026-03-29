import React from 'react';
import Image from 'next/image';
import { getThumbnailUrl } from '@/lib/image-loader';

interface ImageMetric {
  id: string;
  storage_path: string;
  filename: string;
  album_name: string;
  views: number;
  downloads: number;
  downloadRatePercent: string;
}

export function TopImagesList({ images }: { images: ImageMetric[] }) {
  if (!images || images.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-bf-gray-200">
        <h3 className="font-sans font-bold text-lg mb-4">Top Images (Downloads)</h3>
        <p className="text-bf-gray-500 text-sm">No image data available for this range.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-bf-gray-200">
      <h3 className="font-sans font-bold text-lg mb-4 text-bf-black">Top Images (Downloads)</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left font-sans text-sm">
          <thead>
            <tr className="border-b border-bf-gray-200 text-bf-gray-500 uppercase tracking-widest text-[0.65rem]">
              <th className="pb-3 px-2">Image</th>
              <th className="pb-3 px-2">Album</th>
              <th className="pb-3 px-2 text-right">Views</th>
              <th className="pb-3 px-2 text-right">Downloads</th>
              <th className="pb-3 px-2 text-right">Conv. Rate</th>
            </tr>
          </thead>
          <tbody>
            {images.map((img, idx) => (
              <tr key={img.id} className="border-b border-bf-gray-100 last:border-0 hover:bg-bf-cream/30 transition-colors">
                <td className="py-3 px-2 flex items-center gap-4">
                  <span className="text-bf-gray-400 font-medium w-4">{idx + 1}</span>
                  <div className="relative w-12 h-12 rounded bg-bf-gray-100 overflow-hidden">
                    <Image
                      src={getThumbnailUrl(img.storage_path, 100, 60)}
                      alt={img.filename || 'thumbnail'}
                      fill
                      className="object-cover"
                    />
                  </div>
                </td>
                <td className="py-3 px-2 text-bf-black font-medium">{img.album_name || 'N/A'}</td>
                <td className="py-3 px-2 text-right tabular-nums">{img.views.toLocaleString()}</td>
                <td className="py-3 px-2 text-right tabular-nums font-bold text-bf-black">{img.downloads.toLocaleString()}</td>
                <td className="py-3 px-2 text-right tabular-nums text-bf-rosegold-start">{img.downloadRatePercent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
