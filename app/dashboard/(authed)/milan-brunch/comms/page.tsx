import { createAdminClient } from "@/lib/supabase/admin";
import { CommsView } from "./CommsView";
import type { AudienceCounts, MessageLogRow, SampleRecipient } from "./types";

export const dynamic = "force-dynamic";

export default async function CommsPage() {
  const admin = createAdminClient();

  const [{ count: total }, { count: checkedIn }, { data: sample }, { data: messages }] =
    await Promise.all([
      admin
        .from("milan_brunch_rsvps")
        .select("id", { count: "exact", head: true }),
      admin
        .from("milan_brunch_rsvps")
        .select("id", { count: "exact", head: true })
        .not("checked_in_at", "is", null),
      admin
        .from("milan_brunch_rsvps")
        .select("full_name, email")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from("milan_brunch_messages")
        .select("id, created_at, sent_by, channel, subject, audience, recipient_count, status")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  const counts: AudienceCounts = {
    all: total ?? 0,
    checked_in: checkedIn ?? 0,
    not_checked_in: (total ?? 0) - (checkedIn ?? 0),
  };

  return (
    <CommsView
      counts={counts}
      sampleRecipient={(sample as SampleRecipient | null) ?? null}
      messages={(messages ?? []) as MessageLogRow[]}
    />
  );
}
