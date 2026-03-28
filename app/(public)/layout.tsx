"use client";

import { AgeGate } from "./components/AgeGate";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AgeGate />
      {children}
    </>
  );
}
