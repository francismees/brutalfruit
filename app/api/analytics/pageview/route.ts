import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createHash } from 'crypto';

export const runtime = 'nodejs';

function generateVisitorHash(ip: string, userAgent: string): string {
  const date = new Date().toISOString().split('T')[0];
  return createHash('sha256')
    .update(`${ip}:${userAgent}:${date}`)
    .digest('hex')
    .substring(0, 16);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Extract headers
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const country = request.headers.get('x-vercel-ip-country') || null;
    
    const visitorHash = generateVisitorHash(ip, userAgent);
    const supabaseAdmin = createAdminClient();
    
    // We intentionally don't await this so it doesn't block the response
    supabaseAdmin.from('analytics_page_views').insert({
      page_path: body.page_path,
      album_id: body.album_id || null,
      session_id: body.session_id,
      referrer: body.referrer || null,
      utm_source: body.utm_source || null,
      utm_medium: body.utm_medium || null,
      utm_campaign: body.utm_campaign || null,
      device_type: body.device_type,
      screen_width: body.screen_width,
      user_agent: userAgent,
      country: country,
      visitor_hash: visitorHash,
    }).then(({ error }) => {
      if (error) console.error('Error inserting page view analytics:', error);
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Failed to parse analytics pageview request', error);
    return NextResponse.json({ success: false }, { status: 400 });
  }
}
