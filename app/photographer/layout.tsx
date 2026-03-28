"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

const photographerNav = [
  { href: "/photographer", label: "Upload Center", icon: "upload", active: true },
];

export default function PhotographerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuthed, setIsAuthed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
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
      <div className="min-h-screen bg-bf-blush flex items-center justify-center">
        <div className="skeleton w-48 h-6 rounded" />
      </div>
    );
  }

  if (!isAuthed) return null;

  return (
    <div className="min-h-screen bg-bf-cream flex">
      {/* Sidebar — desktop only */}
      <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-bf-gray-200 p-5">
        <div className="mb-10">
          <div 
            className="w-32 h-5 bg-rosegold" 
            style={{ 
              WebkitMaskImage: 'url(/bf-logo-wordmark.svg)', 
              WebkitMaskSize: 'contain', 
              WebkitMaskRepeat: 'no-repeat', 
              WebkitMaskPosition: 'left center',
              maskImage: 'url(/bf-logo-wordmark.svg)',
              maskSize: 'contain',
              maskRepeat: 'no-repeat',
              maskPosition: 'left center',
            }} 
            title="Brutal Fruit"
          />
        </div>

        <nav className="flex-1 space-y-1">
          {photographerNav.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-sans transition-colors ${
                item.active
                  ? "bg-bf-cream text-bf-black font-medium"
                  : "text-bf-gray-400 hover:text-bf-black hover:bg-bf-cream/50"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

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
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}
