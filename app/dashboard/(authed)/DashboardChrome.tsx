"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface DashboardChromeProps {
  email: string;
  children: React.ReactNode;
}

const NAV = [
  { href: "/dashboard/milan-brunch", label: "RSVPs" },
  { href: "/dashboard/milan-brunch/check-in", label: "Check-in" },
  { href: "/dashboard/milan-brunch/comms", label: "Comms" },
];

export function DashboardChrome({ email, children }: DashboardChromeProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/dashboard/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-bf-cream flex flex-col">
      <header className="bg-white border-b border-bf-gray-200">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center gap-4">
          <Link href="/dashboard/milan-brunch" className="flex items-center gap-2">
            <div
              className="w-24 h-4 bg-rosegold"
              style={{
                WebkitMaskImage: "url(/bf-logo-wordmark.svg)",
                WebkitMaskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                WebkitMaskPosition: "left center",
                maskImage: "url(/bf-logo-wordmark.svg)",
                maskSize: "contain",
                maskRepeat: "no-repeat",
                maskPosition: "left center",
              }}
              title="Brutal Fruit"
            />
            <span className="label-ui text-bf-gray-400 hidden sm:inline">
              Milan Brunch
            </span>
          </Link>

          <nav className="flex items-center gap-1 ml-auto">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-full font-sans text-xs uppercase tracking-wider transition-colors ${
                    active
                      ? "bg-bf-rosegold-flat text-white"
                      : "text-bf-gray-700 hover:bg-bf-cream"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center gap-3 ml-2 border-l border-bf-gray-200 pl-4">
            <span className="font-sans text-xs text-bf-gray-400 truncate max-w-[180px]">
              {email}
            </span>
            <button
              onClick={handleSignOut}
              className="font-sans text-xs uppercase tracking-wider text-bf-gray-400 hover:text-bf-ruby transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
