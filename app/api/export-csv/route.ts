import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasDashboardAccess } from "@/lib/dashboard/allowlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !hasDashboardAccess(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("milan_brunch_rsvps")
    .select(
      "full_name, phone_e164, email, created_at, checked_in_at, checked_in_by, source"
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const headers = [
    "Full name",
    "Phone (E.164)",
    "Email",
    "RSVP'd at",
    "Checked in at",
    "Checked in by",
    "Source",
  ];

  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.full_name,
        r.phone_e164,
        r.email,
        r.created_at,
        r.checked_in_at ?? "",
        r.checked_in_by ?? "",
        r.source ?? "",
      ]
        .map(csvEscape)
        .join(",")
    ),
  ].join("\n");

  const filename = `milan-brunch-rsvps-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
