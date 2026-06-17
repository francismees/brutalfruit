import { createAdminClient } from "@/lib/supabase/admin";
import { RsvpTable } from "./RsvpTable";
import type { RsvpRow } from "./types";

export const dynamic = "force-dynamic";

export default async function MilanBrunchDashboardPage() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("milan_brunch_rsvps")
    .select("id, full_name, phone_e164, email, created_at, checked_in_at, checked_in_by")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-5 py-10">
        <p className="font-sans text-sm text-bf-ruby">
          Couldn&apos;t load RSVPs: {error.message}
        </p>
      </div>
    );
  }

  const rows: RsvpRow[] = data ?? [];
  return <RsvpTable rows={rows} />;
}
