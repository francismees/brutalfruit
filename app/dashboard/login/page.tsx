"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function DashboardLoginPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setState("sending");

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=/dashboard/milan-brunch`;

    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: true,
      },
    });

    if (authError) {
      setState("error");
      setError(authError.message);
      return;
    }

    setState("sent");
  };

  return (
    <div className="min-h-screen bg-bf-blush flex items-center justify-center px-6">
      <div className="w-full max-w-sm animate-fade-in-up">
        <div className="text-center mb-10">
          <div
            className="w-32 h-5 bg-rosegold mx-auto"
            style={{
              WebkitMaskImage: "url(/bf-logo-wordmark.svg)",
              WebkitMaskSize: "contain",
              WebkitMaskRepeat: "no-repeat",
              WebkitMaskPosition: "center",
              maskImage: "url(/bf-logo-wordmark.svg)",
              maskSize: "contain",
              maskRepeat: "no-repeat",
              maskPosition: "center",
            }}
            title="Brutal Fruit"
          />
          <p className="label-ui text-bf-gray-400 mt-3">Milan Brunch Dashboard</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-bf-gray-200/60 p-8">
          {state === "sent" ? (
            <div className="text-center space-y-3">
              <h1 className="heading-display text-xl text-bf-black">
                Check your inbox.
              </h1>
              <p className="font-sans text-sm text-bf-gray-400">
                We sent a magic link to{" "}
                <span className="text-bf-black">{email}</span>. Click it to sign
                in — the tab will redirect automatically.
              </p>
              <button
                type="button"
                onClick={() => {
                  setState("idle");
                  setEmail("");
                }}
                className="font-sans text-xs uppercase tracking-wider text-bf-gray-400 hover:text-bf-ruby"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h1 className="heading-display text-2xl text-center mb-2">
                Sign in
              </h1>
              <p className="text-editorial text-sm text-bf-text-secondary text-center mb-4">
                We&apos;ll email you a one-time link.
              </p>
              <Input
                label="Email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@brutalfruit.co.tz"
                required
                error={error ?? undefined}
              />
              <Button
                type="submit"
                variant="gradient"
                className="w-full mt-2"
                disabled={state === "sending"}
              >
                {state === "sending" ? "Sending…" : "Send me a link"}
              </Button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-bf-gray-400 font-sans mt-6">
          Access is restricted to the allowlisted team.
        </p>
      </div>
    </div>
  );
}
