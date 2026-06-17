/**
 * Server-only phone helpers. libphonenumber-js is heavy (~145KB), so we keep
 * it out of the public client bundle and run the canonical normalization in
 * the API route.
 *
 * Do NOT import this module from a `"use client"` component.
 */
import { parsePhoneNumberFromString } from "libphonenumber-js";

export function normalizePhone(raw: string): string | null {
  const parsed = parsePhoneNumberFromString(raw.trim(), "TZ");
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number;
}
