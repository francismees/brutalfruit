import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasDashboardAccess } from "@/lib/dashboard/allowlist";
import {
  firstNameOf,
  markdownToEmailHtml,
  mergeFirstName,
} from "@/lib/email/markdown";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Audience = "all" | "checked_in" | "not_checked_in";
type Channel = "email" | "sms";

interface SendBody {
  channel?: Channel;
  audience?: Audience;
  subject?: string;
  body?: string;
}

const BATCH_SIZE = 50;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !hasDashboardAccess(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: SendBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { channel = "email", audience, subject, body: md } = body;

  if (channel === "sms") {
    return NextResponse.json(
      { error: "SMS sending is not yet implemented." },
      { status: 501 }
    );
  }

  if (channel !== "email") {
    return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
  }

  if (!audience || !["all", "checked_in", "not_checked_in"].includes(audience)) {
    return NextResponse.json({ error: "Invalid audience" }, { status: 400 });
  }

  const subjectTrim = (subject ?? "").trim();
  const bodyTrim = (md ?? "").trim();
  if (!subjectTrim || !bodyTrim) {
    return NextResponse.json(
      { error: "Subject and body are required" },
      { status: 400 }
    );
  }

  const from = process.env.RESEND_FROM_EMAIL;
  const apiKey = process.env.RESEND_API_KEY;
  if (!from || !apiKey) {
    return NextResponse.json(
      { error: "Email sender not configured" },
      { status: 500 }
    );
  }

  const admin = createAdminClient();
  let query = admin
    .from("milan_brunch_rsvps")
    .select("full_name, email");

  if (audience === "checked_in") query = query.not("checked_in_at", "is", null);
  if (audience === "not_checked_in") query = query.is("checked_in_at", null);

  const { data: recipients, error: rcpError } = await query;
  if (rcpError) {
    return NextResponse.json(
      { error: `Audience query failed: ${rcpError.message}` },
      { status: 500 }
    );
  }

  if (!recipients || recipients.length === 0) {
    return NextResponse.json(
      { error: "No recipients in this audience" },
      { status: 400 }
    );
  }

  const resend = new Resend(apiKey);
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const chunk = recipients.slice(i, i + BATCH_SIZE);
    const payload = chunk.map((r) => {
      const mergedMd = mergeFirstName(bodyTrim, r.full_name ?? "");
      const mergedSubject = subjectTrim.replaceAll(
        "{{first_name}}",
        firstNameOf(r.full_name ?? "")
      );
      return {
        from,
        to: r.email,
        subject: mergedSubject,
        html: markdownToEmailHtml(mergedMd),
      };
    });

    const { data, error } = await resend.batch.send(payload);
    if (error) {
      console.error("Resend batch failed:", error);
      failed += chunk.length;
      continue;
    }
    sent += data?.data?.length ?? chunk.length;
  }

  const status = failed === 0 ? "sent" : sent === 0 ? "failed" : "partial";

  await admin.from("milan_brunch_messages").insert({
    sent_by: user.email ?? user.id,
    channel,
    subject: subjectTrim,
    body: bodyTrim,
    audience,
    recipient_count: sent,
    status,
  });

  if (failed > 0 && sent === 0) {
    return NextResponse.json(
      { error: "All sends failed.", sent, failed },
      { status: 500 }
    );
  }

  return NextResponse.json({ sent, failed, status });
}
