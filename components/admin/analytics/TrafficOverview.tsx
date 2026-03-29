import { StatCard } from "@/components/dashboard/StatCard";

interface Metric {
  totalViews: number;
  uniqueVisitors: number;
  totalDownloads: number;
  downloadRatePerVisitor: number;
}

export function TrafficOverview({ metrics }: { metrics: Metric }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        }
        label="Total Page Views"
        value={(metrics.totalViews || 0).toLocaleString()}
      />
      <StatCard
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        }
        label="Unique Visitors"
        value={(metrics.uniqueVisitors || 0).toLocaleString()}
      />
      <StatCard
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        }
        label="Total Downloads"
        value={(metrics.totalDownloads || 0).toLocaleString()}
      />
      <StatCard
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M18 20V10M12 20V4M6 20v-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        }
        label="Avg Downloads/Visitor"
        value={(metrics.downloadRatePerVisitor || 0).toFixed(2)}
        highlight
      />
    </div>
  );
}
