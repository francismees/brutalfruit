import type { User } from "@supabase/supabase-js";

/**
 * Comma-separated DASHBOARD_ALLOWED_EMAILS, parsed once per request.
 * Emails are lowercased + trimmed; entries with no @ are ignored.
 */
export function dashboardAllowlist(): string[] {
  return (process.env.DASHBOARD_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.includes("@"));
}

/**
 * Dashboard access rules:
 *   1. The existing platform `admin` role bypasses the allowlist
 *      (the site's super-admin already has access to everything).
 *   2. Otherwise, email must appear in DASHBOARD_ALLOWED_EMAILS.
 */
export function hasDashboardAccess(user: User | null | undefined): boolean {
  if (!user) return false;
  const role = user.app_metadata?.role;
  if (role === "admin" || role === "super_admin") return true;
  const email = user.email?.toLowerCase();
  if (!email) return false;
  return dashboardAllowlist().includes(email);
}

/** @deprecated — kept for backwards compat. Prefer `hasDashboardAccess(user)`. */
export function isAllowlisted(email: string | null | undefined): boolean {
  if (!email) return false;
  return dashboardAllowlist().includes(email.toLowerCase());
}
