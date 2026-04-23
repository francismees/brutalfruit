import { TrafficOverview } from '@/components/admin/analytics/TrafficOverview';
import { TopImagesList } from '@/components/admin/analytics/TopImagesList';
import { MediaBreakdown } from '@/components/admin/analytics/MediaBreakdown';
import { getAnalyticsSummary, getTopImages, getMediaBreakdown } from '@/lib/analytics/queries';
import { PageHeader } from '@/components/dashboard/PageHeader';

// Set this to a dynamic route since it depends on query params and live data
export const dynamic = 'force-dynamic';

export default async function AnalyticsDashboard({
  searchParams
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  // Default to last 7 days for the demo MVP
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);

  const startDateStr = start.toISOString();
  const endDateStr = end.toISOString();

  // Fetch server side data
  const summary = await getAnalyticsSummary(startDateStr, endDateStr);
  const mediaBreakdown = await getMediaBreakdown(startDateStr, endDateStr);
  const topImages = await getTopImages(startDateStr, endDateStr, 15);

  return (
    <div className="flex-1 p-8 max-w-[1360px] w-full animate-fade-in-up">
      <PageHeader
        title="Analytics"
        subtitle="Engagement, downloads, and visitor metrics."
        actions={
          <a
            href="/api/analytics/export?format=xlsx"
            className="px-5 py-2.5 rounded-lg text-xs font-sans font-bold uppercase tracking-widest border border-bf-ruby text-bf-ruby hover:bg-bf-ruby hover:text-white transition-colors inline-flex items-center gap-2"
            download
          >
            Export XLSX
          </a>
        }
      />

      {/* Traffic Summary Cards */}
      <TrafficOverview metrics={{
        totalViews: summary.totalViews,
        uniqueVisitors: summary.uniqueVisitors,
        totalDownloads: summary.totalDownloads,
        downloadRatePerVisitor: summary.downloadRatePerVisitor
      }} />

      {/* Media Type Breakdown */}
      <MediaBreakdown data={mediaBreakdown} />

      {/* Top Images Table */}
      <div className="mt-6">
        <TopImagesList images={topImages} />
      </div>
    </div>
  );
}
