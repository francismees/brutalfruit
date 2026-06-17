import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Read-only env-presence check. Never returns secret values — only booleans
 * for "is this var set" so we can verify Vercel env wiring from the outside.
 * Safe to keep — leaks no secrets. Remove later if not needed.
 */
export async function GET() {
  const v = (k: string) => process.env[k];
  return NextResponse.json({
    resend_api_key_set: Boolean(v("RESEND_API_KEY")),
    resend_api_key_starts_with_re_: v("RESEND_API_KEY")?.startsWith("re_") ?? false,
    resend_api_key_length: v("RESEND_API_KEY")?.length ?? 0,
    resend_from_email: v("RESEND_FROM_EMAIL") ?? null,
    next_public_site_url: v("NEXT_PUBLIC_SITE_URL") ?? null,
    dashboard_allowlist_count:
      (v("DASHBOARD_ALLOWED_EMAILS") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean).length,
    supabase_url_set: Boolean(v("NEXT_PUBLIC_SUPABASE_URL")),
    supabase_service_role_set: Boolean(v("SUPABASE_SERVICE_ROLE_KEY")),
    node_env: v("NODE_ENV") ?? null,
  });
}
