import { createClient } from "@/lib/supabase/server";

export async function getAnalyticsSummary(startDate: string, endDate: string, albumId?: string) {
  const supabase = await createClient();
  
  // Base query for page views
  let pageViewsQuery = supabase
    .from('analytics_page_views')
    .select('id, visitor_hash', { count: 'exact' })
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (albumId) pageViewsQuery = pageViewsQuery.eq('album_id', albumId);

  const { data: pageViews } = await pageViewsQuery;
  
  // Total page views
  const totalViews = pageViews?.length || 0;
  
  // Unique visitors
  const uniqueVisitorsSet = new Set(pageViews?.map(pv => pv.visitor_hash) || []);
  const uniqueVisitors = uniqueVisitorsSet.size;

  // Base query for downloads
  let downloadsQuery = supabase
    .from('analytics_image_events')
    .select('id', { count: 'exact' })
    .eq('event_type', 'download')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (albumId) downloadsQuery = downloadsQuery.eq('album_id', albumId);

  const { count: totalDownloads } = await downloadsQuery;
  
  return {
    totalViews,
    uniqueVisitors,
    totalDownloads: totalDownloads || 0,
    downloadRatePerVisitor: uniqueVisitors > 0 ? (totalDownloads || 0) / uniqueVisitors : 0
  };
}

export async function getDeviceBreakdown(startDate: string, endDate: string) {
  const supabase = await createClient();
  // Supabase RPC or group by for device types
  // For simplicity, fetch needed data or create an RPC later if data becomes massive
  const { data } = await supabase
    .from('analytics_page_views')
    .select('device_type')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  const breakdown = { mobile: 0, tablet: 0, desktop: 0 };
  data?.forEach(row => {
    if (row.device_type === 'mobile') breakdown.mobile++;
    else if (row.device_type === 'tablet') breakdown.tablet++;
    else breakdown.desktop++;
  });

  return breakdown;
}

export async function getTopImages(startDate: string, endDate: string, limit: number = 10) {
  // To get top downloaded images we can join with the images table via RPC
  // or via regular PostgREST if we have the right relations set up.
  // Since we don't have an RPC function configured right now for the complex queries,
  // we'll fetch image events and group in javascript or ask user to create RPC if data is huge.
  // For now, doing JS aggregation for safety and speed to deliver Phase 1 MVP.
  const supabase = await createClient();

  const { data: events } = await supabase
    .from('analytics_image_events')
    .select(`
      image_id,
      event_type,
      albums ( name ),
      images ( storage_path, filename )
    `)
    .in('event_type', ['view', 'download'])
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (!events) return [];

  const imageStats: Record<string, any> = {};

  events.forEach((ev: any) => {
    if (!imageStats[ev.image_id]) {
      imageStats[ev.image_id] = {
        id: ev.image_id,
        storage_path: ev.images?.storage_path,
        filename: ev.images?.filename,
        album_name: ev.albums?.name,
        views: 0,
        downloads: 0
      };
    }
    if (ev.event_type === 'view') imageStats[ev.image_id].views++;
    if (ev.event_type === 'download') imageStats[ev.image_id].downloads++;
  });

  const sortedImages = Object.values(imageStats)
    .sort((a: any, b: any) => b.downloads - a.downloads)
    .slice(0, limit);

  return sortedImages.map(img => ({
    ...img,
    downloadRatePercent: img.views > 0 ? ((img.downloads / img.views) * 100).toFixed(1) : '0.0'
  }));
}

export async function getMediaBreakdown(startDate: string, endDate: string) {
  const supabase = await createClient();

  const { data: events } = await supabase
    .from('analytics_image_events')
    .select(`
      event_type,
      images ( media_type )
    `)
    .in('event_type', ['view', 'download'])
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  const breakdown = {
    image: { media_type: 'image', views: 0, downloads: 0 },
    video: { media_type: 'video', views: 0, downloads: 0 }
  };

  if (!events) return Object.values(breakdown);

  events.forEach((ev: any) => {
    const type = ev.images?.media_type === 'video' ? 'video' : 'image';
    if (ev.event_type === 'view') breakdown[type].views++;
    if (ev.event_type === 'download') breakdown[type].downloads++;
  });

  return Object.values(breakdown);
}
