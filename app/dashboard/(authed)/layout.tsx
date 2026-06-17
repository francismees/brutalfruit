import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasDashboardAccess } from "@/lib/dashboard/allowlist";
import { DashboardChrome } from "./DashboardChrome";
import { AccessDenied } from "./AccessDenied";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/dashboard/login");
  }

  if (!hasDashboardAccess(user)) {
    return <AccessDenied email={user.email ?? ""} />;
  }

  return <DashboardChrome email={user.email ?? ""}>{children}</DashboardChrome>;
}
