import { createAdminClient } from "@/lib/supabase/admin";
import { CheckInView } from "./CheckInView";
import type { RsvpRow } from "../types";

export const dynamic = "force-dynamic";

export default async function CheckInPage() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("milan_brunch_rsvps")
    .select("id, full_name, phone_e164, email, created_at, checked_in_at, checked_in_by, qr_token")
    .order("full_name", { ascending: true });

  const rows = (data ?? []) as Array<RsvpRow & { qr_token: string }>;

  return <CheckInView initialRows={rows} />;
}
