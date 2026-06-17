import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasDashboardAccess } from "@/lib/dashboard/allowlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !hasDashboardAccess(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { qr_token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token = body.qr_token?.toString().trim();
  if (!token || !UUID_RE.test(token)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Look up the row first so we can distinguish "not found" vs "already in".
  const { data: existing, error: lookupErr } = await admin
    .from("milan_brunch_rsvps")
    .select("id, full_name, checked_in_at")
    .eq("qr_token", token)
    .maybeSingle();

  if (lookupErr) {
    console.error("Check-in lookup failed:", lookupErr);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (existing.checked_in_at) {
    return NextResponse.json(
      {
        name: existing.full_name,
        checked_in_at: existing.checked_in_at,
        already: true,
      },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateErr } = await admin
    .from("milan_brunch_rsvps")
    .update({
      checked_in_at: now,
      checked_in_by: user.email ?? user.id,
    })
    .eq("id", existing.id)
    .is("checked_in_at", null) // race-safe: only updates if still null
    .select("full_name, checked_in_at")
    .maybeSingle();

  if (updateErr) {
    console.error("Check-in update failed:", updateErr);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  // Another scanner won the race — return the existing state.
  if (!updated) {
    const { data: latest } = await admin
      .from("milan_brunch_rsvps")
      .select("full_name, checked_in_at")
      .eq("id", existing.id)
      .single();
    return NextResponse.json(
      {
        name: latest?.full_name ?? existing.full_name,
        checked_in_at: latest?.checked_in_at,
        already: true,
      },
      { status: 409 }
    );
  }

  return NextResponse.json({
    name: updated.full_name,
    checked_in_at: updated.checked_in_at,
  });
}
