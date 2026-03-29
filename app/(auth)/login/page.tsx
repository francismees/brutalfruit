"use client";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { BrandLogo } from "@/components/BrandLogo";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const supabase = createClient();
    // If input contains @, treat as email (admin); otherwise append synthetic domain
    const loginEmail = username.includes("@") ? username : `${username}@brutalfruit.local`;
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (authError) {
      setError("Invalid username or password.");
      setIsLoading(false);
      return;
    }

    // Route based on role
    const role = data.user?.app_metadata?.role;
    if (role === "admin") {
      router.push("/admin");
    } else {
      router.push("/photographer");
    }
  };

  return (
    <div className="min-h-screen bg-bf-blush flex items-center justify-center px-6">
      <div className="w-full max-w-sm animate-fade-in-up">
        <div className="text-center mb-10">
          <BrandLogo variant="wordmark" width={140} height={22} className="mx-auto mb-2 opacity-80" />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-bf-gray-200/50 p-8">
          <h1 className="heading-display text-2xl text-center mb-6">Sign In</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="your username"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              error={error}
            />
            <Button
              type="submit"
              variant="gradient"
              className="w-full mt-2"
              disabled={isLoading}
            >
              {isLoading ? "SIGNING IN..." : "SIGN IN"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-bf-gray-400 font-sans mt-6">
          Access is by invitation only.
          <br />
          Contact your admin for credentials.
        </p>
      </div>
    </div>
  );
}
