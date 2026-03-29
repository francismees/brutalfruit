'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import { Suspense } from 'react';

function TrackingLogic({ albumId }: { albumId?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // We wrap this in a setTimeout of 0 to ensure it runs asynchronously
    // after the initial page hydration, preserving perceived performance.
    const timer = setTimeout(() => {
      const sessionId = getSessionId();
      const deviceType = getDeviceType();

      fetch('/api/analytics/pageview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page_path: pathname,
          album_id: albumId || null,
          session_id: sessionId,
          referrer: document.referrer || null,
          utm_source: searchParams.get('utm_source'),
          utm_medium: searchParams.get('utm_medium'),
          utm_campaign: searchParams.get('utm_campaign'),
          device_type: deviceType,
          screen_width: window.innerWidth,
        }),
        keepalive: true,  // ensures request completes even if user navigates away
      }).catch(() => {
        // Silent fail for analytics so we don't break the UI
      });
    }, 0);
    
    return () => clearTimeout(timer);
  }, [pathname, searchParams, albumId]);

  return null;
}

export function AnalyticsTracker({ albumId }: { albumId?: string }) {
  return (
    <Suspense fallback={null}>
      <TrackingLogic albumId={albumId} />
    </Suspense>
  );
}

function getDeviceType(): string {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

function getSessionId(): string {
  if (typeof sessionStorage === 'undefined') return '';
  let id = sessionStorage.getItem('bf_session');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('bf_session', id);
  }
  return id;
}
