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
    
    // Extract headers for hashing
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    const visitorHash = generateVisitorHash(ip, userAgent);
    const supabaseAdmin = createAdminClient();
    
    // Non-blocking insert using admin service role
    supabaseAdmin.from('analytics_image_events').insert({
      image_id: body.image_id,
      album_id: body.album_id,
      event_type: body.event_type,
      session_id: body.session_id,
      device_type: body.device_type,
      visitor_hash: visitorHash,
    }).then(({ error }) => {
      if (error) console.error('Error inserting image event analytics:', error);
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Failed to parse image event request', error);
    return NextResponse.json({ success: false }, { status: 400 });
  }
}
