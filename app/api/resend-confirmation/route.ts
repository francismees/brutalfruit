import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendConfirmationEmail } from "@/lib/email/sendConfirmationEmail";

export const runtime = "nodejs";

const RATE_LIMIT_WINDOW_MS = 60_000;
const lastSentByEmail = new Map<string, number>();

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const last = lastSentByEmail.get(email);
  if (last && now - last < RATE_LIMIT_WINDOW_MS) return false;
  lastSentByEmail.set(email, now);
  // Best-effort cleanup so the map doesn't grow forever.
  if (lastSentByEmail.size > 500) {
    for (const [key, ts] of lastSentByEmail) {
      if (now - ts > RATE_LIMIT_WINDOW_MS * 5) lastSentByEmail.delete(key);
    }
  }
  return true;
}

export async function POST(request: NextRequest) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.toString().trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  if (!checkRateLimit(email)) {
    return NextResponse.json(
      { error: "Rate limited. Try again in a minute." },
      { status: 429 }
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("milan_brunch_rsvps")
    .select("qr_token, full_name, email")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    console.error("Resend lookup failed:", error);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }

  // Don't leak whether the email exists — return 200 either way.
  if (!data) {
    return NextResponse.json({ sent: false });
  }

  try {
    await sendConfirmationEmail({
      to: data.email,
      name: data.full_name,
      qr_token: data.qr_token,
    });
  } catch (err) {
    console.error("Resend email failed:", err);
    return NextResponse.json({ error: "Send failed" }, { status: 500 });
  }

  return NextResponse.json({ sent: true });
}
