"use client";

import { AgeGate } from "./components/AgeGate";
import { AnalyticsTracker } from "@/components/analytics/AnalyticsTracker";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AgeGate />
      <AnalyticsTracker />
      {children}
    </>
  );
}
