/**
 * Milan Brunch — single source of truth for event copy + dates.
 * Never hardcode these elsewhere.
 */

export const EVENT_NAME = "Milan Brunch";
export const EVENT_VENUE = "Wildflour Café";
export const EVENT_FULL_ADDRESS = "Masaki, Dar es Salaam";
export const EVENT_DATE_ISO = "2026-06-20T11:00:00+03:00";
export const EVENT_DATE_END_ISO = "2026-06-20T14:00:00+03:00";
export const EVENT_DISPLAY = "Saturday, 20 June 2026 · 11am";
export const RSVP_DEADLINE_ISO = "2026-06-19T13:00:00+03:00";
export const PRIZE_HEADLINE = "Win a trip to Milan";
export const PUBLIC_ROUTE = "/milan-brunch";
export const DRESS_CODE = "Bring your softest brunch energy";

export const EMAIL_SUBJECT = "You're in for Brutal Fruit Milan Brunch 💌";

/** True if RSVPs are still open at `now` (defaults to current time). */
export function isRsvpOpen(now: Date = new Date()): boolean {
  return now.getTime() < new Date(RSVP_DEADLINE_ISO).getTime();
}

/** Absolute URL helper for emails and shareable links. */
export function siteUrl(path = ""): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://brutalfruit.co.tz";
  if (!path) return base;
  return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
}

/** Confirmation URL for a given QR token. */
export function confirmationUrl(qrToken: string): string {
  return siteUrl(`/milan-brunch/confirmed?token=${qrToken}`);
}
