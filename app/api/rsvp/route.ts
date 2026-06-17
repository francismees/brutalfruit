import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rsvpSchema } from "@/lib/milan-brunch/validation";
import { normalizePhone } from "@/lib/milan-brunch/phone";
import { isRsvpOpen } from "@/lib/milan-brunch/config";
import { sendConfirmationEmail } from "@/lib/email/sendConfirmationEmail";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // Enforce deadline server-side — never trust the client.
  if (!isRsvpOpen()) {
    return NextResponse.json(
      { error: "RSVPs are closed" },
      { status: 403 }
    );
  }

  let parsed;
  try {
    const raw = await request.json();
    parsed = rsvpSchema.safeParse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: first?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { full_name, phone, email, hp_company } = parsed.data;

  // Honeypot — silently 200 (don't tell the bot it failed) but skip the insert.
  if (hp_company && hp_company.length > 0) {
    return NextResponse.json({ qr_token: "00000000-0000-0000-0000-000000000000" });
  }

  const phone_e164 = normalizePhone(phone);
  if (!phone_e164) {
    return NextResponse.json(
      { error: "Enter a valid phone number" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("milan_brunch_rsvps")
    .insert({
      full_name: full_name.trim(),
      phone_e164,
      email,
      source: "public_form",
    })
    .select("qr_token, full_name, email")
    .single();

  if (error) {
    // Postgres unique violation
    if (error.code === "23505") {
      const reason = /email/i.test(error.message)
        ? "duplicate_email"
        : "duplicate_phone";
      return NextResponse.json({ reason }, { status: 409 });
    }
    console.error("RSVP insert failed:", error);
    return NextResponse.json(
      { error: "Couldn't save your RSVP. Please try again." },
      { status: 500 }
    );
  }

  // Fire the email but don't block the user on it — log if it fails.
  try {
    await sendConfirmationEmail({
      to: data.email,
      name: data.full_name,
      qr_token: data.qr_token,
    });
  } catch (err) {
    console.error("Confirmation email failed:", err);
  }

  return NextResponse.json({ qr_token: data.qr_token });
}
