"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

interface AccessDeniedProps {
  email: string;
}

export function AccessDenied({ email }: AccessDeniedProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/dashboard/login");
    router.refresh();
  };

  // Sign out the disallowed session as soon as the page mounts so a refresh
  // doesn't loop them back into this screen.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.signOut().catch(() => undefined);
  }, []);

  return (
    <div className="min-h-screen bg-bf-blush flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="heading-display text-2xl text-bf-black mb-2">Access denied.</h1>
        <p className="font-sans text-sm text-bf-gray-400 mb-6">
          {email} isn&apos;t on the dashboard allowlist. Ask an admin to add you.
        </p>
        <Button variant="outline" onClick={handleSignOut} className="w-full">
          Back to sign in
        </Button>
      </div>
    </div>
  );
}
