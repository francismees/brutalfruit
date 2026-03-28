"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

interface BottomNavProps {
  albumCount: number;
}

export function BottomNav({ albumCount }: BottomNavProps) {
  const pathname = usePathname();

  // Hide when only one album — no need to navigate back
  if (albumCount <= 1) return null;

  const navItems = [
    {
      href: "/albums",
      label: "Albums",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      ),
    },
    {
      href: "#download",
      label: "Download",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 3v13m0 0l-4-4m4 4l4-4M5 19h14" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      isCenter: true,
    },
    {
      href: "/login",
      label: "Profile",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-bf-gray-200 pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

          if (item.isCenter) {
            return (
              <button
                key={item.label}
                className="relative -mt-5 w-14 h-14 rounded-full bg-rosegold flex items-center justify-center text-white shadow-lg shadow-bf-rosegold-flat/30"
              >
                {item.icon}
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 transition-colors",
                isActive ? "text-bf-rosegold-flat" : "text-bf-gray-400"
              )}
            >
              {item.icon}
              <span className="text-[0.625rem] font-sans font-medium tracking-wide uppercase">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
