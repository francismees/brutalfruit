import { StatCard } from "@/components/dashboard/StatCard";

interface MediaBreakdownData {
  media_type: string;
  views: number;
  downloads: number;
}

export function MediaBreakdown({ data }: { data: MediaBreakdownData[] }) {
  const images = data.find(d => d.media_type === 'image') || { views: 0, downloads: 0 };
  const videos = data.find(d => d.media_type === 'video') || { views: 0, downloads: 0 };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      <div className="bg-white rounded-xl border border-bf-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-sans font-bold text-bf-gray-400 uppercase tracking-widest mb-4">Images Performance</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl heading-display">{images.views.toLocaleString()}</p>
            <p className="text-xs font-sans text-bf-gray-400">Total Views</p>
          </div>
          <div className="h-10 w-px bg-bf-gray-100" />
          <div>
            <p className="text-2xl heading-display">{images.downloads.toLocaleString()}</p>
            <p className="text-xs font-sans text-bf-gray-400">Total Downloads</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-bf-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-sans font-bold text-bf-gray-400 uppercase tracking-widest mb-4">Videos Performance</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl heading-display">{videos.views.toLocaleString()}</p>
            <p className="text-xs font-sans text-bf-gray-400">Total Views</p>
          </div>
          <div className="h-10 w-px bg-bf-gray-100" />
          <div>
            <p className="text-2xl heading-display">{videos.downloads.toLocaleString()}</p>
            <p className="text-xs font-sans text-bf-gray-400">Total Downloads</p>
          </div>
        </div>
      </div>
    </div>
  );
}
