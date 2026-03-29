'use client';

import { useCallback } from 'react';

// Store viewed images in memory to avoid redundant tracking during a single page load.
// This ensures we only count 1 view per image per session, which helps calculate
// an accurate view-to-download ratio.
const viewedImages = new Set<string>();

export function useTrackImageEvent() {
  /**
   * Tracks discrete interactions with an image.
   * "view" events are automatically deduplicated during the current page load.
   */
  const track = useCallback((
    imageId: string, 
    albumId: string, 
    eventType: 'view' | 'click' | 'download' | 'share'
  ) => {
    // Deduplication strategy for view events
    if (eventType === 'view') {
      if (viewedImages.has(imageId)) {
        return; // Already tracked this view
      }
      viewedImages.add(imageId);
    }

    if (typeof window === 'undefined') return;

    let sessionId = '';
    if (typeof sessionStorage !== 'undefined') {
      sessionId = sessionStorage.getItem('bf_session') || '';
    }

    const w = window.innerWidth;
    const deviceType = w < 768 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop';

    fetch('/api/analytics/image-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_id: imageId,
        album_id: albumId,
        event_type: eventType,
        session_id: sessionId,
        device_type: deviceType
      }),
      keepalive: true,
    }).catch(() => {
      // Silent fail
    });
  }, []);

  return track;
}
