"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const adminNav = [
  { href: "/admin", label: "Dashboard", icon: "grid" },
  { href: "/admin/albums", label: "Albums", icon: "image" },
  { href: "/admin/photographers", label: "Photographers", icon: "users" },
  { href: "/admin/revenue", label: "Revenue", icon: "chart" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuthed, setIsAuthed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.user_metadata?.role !== "admin") {
        router.push("/login");
      } else {
        setIsAuthed(true);
      }
      setIsLoading(false);
    }
    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bf-cream flex items-center justify-center">
        <div className="skeleton w-48 h-6 rounded" />
      </div>
    );
  }

  if (!isAuthed) return null;

  return (
    <div className="min-h-screen bg-bf-cream flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-bf-gray-200 p-5">
        <div className="mb-8">
          <p className="heading-display-italic text-xs tracking-wide" style={{ color: "var(--bf-rosegold-start)" }}>
            BRUTAL FRUIT
          </p>
          <p className="label-ui text-bf-gray-400 text-[0.55rem] mt-0.5">EDITORIAL ADMIN</p>
        </div>

        <nav className="flex-1 space-y-1">
          {adminNav.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-sans transition-colors ${
                  isActive
                    ? "bg-bf-cream text-bf-black font-medium"
                    : "text-bf-gray-400 hover:text-bf-black hover:bg-bf-cream/50"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/admin/albums"
          className="btn-gradient text-center text-xs py-3 mb-4"
        >
          + CREATE NEW EVENT
        </Link>

        <button
          onClick={async () => {
            const supabase = createClient();
            await supabase.auth.signOut();
            router.push("/login");
          }}
          className="flex items-center gap-2 px-3 py-2 text-sm text-bf-gray-400 font-sans hover:text-bf-black transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          LOGOUT
        </button>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
