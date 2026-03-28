"use client";

import { useState, useEffect, useCallback } from "react";
import { AGE_GATE_STORAGE_KEY } from "@/lib/constants";

export function useAgeGate() {
  const [isVerified, setIsVerified] = useState<boolean | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(AGE_GATE_STORAGE_KEY);
    setIsVerified(stored === "true");
  }, []);

  const verify = useCallback(() => {
    localStorage.setItem(AGE_GATE_STORAGE_KEY, "true");
    setIsVerified(true);
  }, []);

  const deny = useCallback(() => {
    setIsVerified(false);
  }, []);

  return { isVerified, verify, deny };
}
