"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { RsvpRow } from "../types";

const Scanner = dynamic(
  () => import("@yudiel/react-qr-scanner").then((m) => m.Scanner),
  { ssr: false }
);

type ScanState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "ok"; name: string; at: string }
  | { kind: "already"; name: string; at: string }
  | { kind: "not_found" }
  | { kind: "error"; message: string };

interface CheckInViewProps {
  initialRows: Array<RsvpRow & { qr_token: string }>;
}

export function CheckInView({ initialRows }: CheckInViewProps) {
  const [rows, setRows] =
    useState<Array<RsvpRow & { qr_token: string }>>(initialRows);
  const [scanState, setScanState] = useState<ScanState>({ kind: "idle" });
  const [scannerOn, setScannerOn] = useState(true);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows.slice(0, 30);
    return rows
      .filter(
        (r) =>
          r.full_name.toLowerCase().includes(q) ||
          r.phone_e164.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [rows, query]);

  const checkIn = async (token: string) => {
    setScanState({ kind: "checking" });
    setScannerOn(false);
    try {
      const res = await fetch("/api/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_token: token }),
      });
      const body = await res.json().catch(() => ({}));

      if (res.status === 404) {
        setScanState({ kind: "not_found" });
        return;
      }
      if (res.status === 409) {
        setScanState({
          kind: "already",
          name: body.name ?? "Guest",
          at: body.checked_in_at ?? "",
        });
        return;
      }
      if (!res.ok) {
        setScanState({
          kind: "error",
          message: body.error ?? "Check-in failed",
        });
        return;
      }
      setScanState({
        kind: "ok",
        name: body.name ?? "Guest",
        at: body.checked_in_at ?? new Date().toISOString(),
      });
      // Update local table state so re-scans show the new status.
      setRows((prev) =>
        prev.map((r) =>
          r.qr_token === token
            ? { ...r, checked_in_at: body.checked_in_at ?? new Date().toISOString() }
            : r
        )
      );
    } catch (err) {
      setScanState({
        kind: "error",
        message: err instanceof Error ? err.message : "Network error",
      });
    }
  };

  const resetScanner = () => {
    setScanState({ kind: "idle" });
    setScannerOn(true);
  };

  const checkInRow = async (row: RsvpRow & { qr_token: string }) => {
    setBusyId(row.id);
    await checkIn(row.qr_token);
    setBusyId(null);
  };

  return (
    <div className="max-w-3xl mx-auto px-5 py-6 space-y-6">
      <div>
        <h1 className="heading-display text-2xl text-bf-black">Door check-in</h1>
        <p className="font-sans text-xs text-bf-gray-400 mt-1">
          Point camera at the guest&apos;s QR. Tap a row to check them in manually.
        </p>
      </div>

      <div className="relative rounded-3xl overflow-hidden border border-bf-gray-200/60 bg-bf-black">
        <div className="aspect-square w-full">
          {scannerOn && scanState.kind === "idle" ? (
            <Scanner
              onScan={(results) => {
                const first = results?.[0];
                if (first?.rawValue) {
                  void checkIn(first.rawValue.trim());
                }
              }}
              onError={(err) => {
                console.warn("Scanner error:", err);
              }}
              constraints={{ facingMode: "environment" }}
              styles={{
                container: {
                  width: "100%",
                  height: "100%",
                  paddingTop: 0,
                },
                video: { objectFit: "cover" },
              }}
              components={{ finder: false }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center px-6">
              <ScanResultCard state={scanState} onReset={resetScanner} />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="label-ui text-bf-gray-400 block mb-1.5">
            Manual lookup
          </label>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, phone, or email…"
            className="w-full px-4 py-2.5 rounded-xl border border-bf-gray-200 bg-white text-bf-text-primary font-sans text-sm placeholder:text-bf-gray-400 focus:outline-none focus:ring-2 focus:ring-bf-rosegold-flat focus:border-transparent transition-all"
          />
        </div>

        <div className="bg-white rounded-2xl border border-bf-gray-200/60 overflow-hidden">
          {filteredRows.length === 0 ? (
            <p className="px-5 py-10 text-center font-sans text-sm text-bf-gray-400">
              No matches.
            </p>
          ) : (
            <ul className="divide-y divide-bf-gray-200/60">
              {filteredRows.map((row) => (
                <li
                  key={row.id}
                  className="px-4 py-3 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-sans text-sm text-bf-black truncate">
                      {row.full_name}
                    </p>
                    <p className="font-sans text-xs text-bf-gray-400 truncate">
                      {row.phone_e164} · {row.email}
                    </p>
                  </div>
                  {row.checked_in_at ? (
                    <Badge variant="success">In</Badge>
                  ) : (
                    <Button
                      type="button"
                      variant="ruby"
                      onClick={() => checkInRow(row)}
                      disabled={busyId === row.id}
                      className="!py-1.5 !px-3 text-[11px]"
                    >
                      {busyId === row.id ? "…" : "Check in"}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ScanResultCard({
  state,
  onReset,
}: {
  state: ScanState;
  onReset: () => void;
}) {
  if (state.kind === "checking") {
    return (
      <div className="bg-white rounded-2xl px-6 py-8 text-center w-full max-w-sm">
        <p className="font-sans text-sm text-bf-gray-400">Checking in…</p>
      </div>
    );
  }
  if (state.kind === "ok") {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-6 py-8 text-center w-full max-w-sm">
        <p className="label-ui text-emerald-700 mb-2">Welcome</p>
        <p className="heading-display text-2xl text-emerald-900 mb-3">
          {state.name}
        </p>
        <p className="font-sans text-xs text-emerald-700 mb-5">
          Checked in {formatWhen(state.at)}
        </p>
        <Button variant="gradient" onClick={onReset} className="w-full">
          Next guest
        </Button>
      </div>
    );
  }
  if (state.kind === "already") {
    return (
      <div className="bg-white border border-bf-ruby/30 rounded-2xl px-6 py-8 text-center w-full max-w-sm">
        <p className="label-ui text-bf-ruby mb-2">Already in</p>
        <p className="heading-display text-xl text-bf-black mb-2">
          {state.name}
        </p>
        <p className="font-sans text-xs text-bf-gray-400 mb-5">
          Checked in at {formatWhen(state.at)}
        </p>
        <Button variant="outline" onClick={onReset} className="w-full">
          Next guest
        </Button>
      </div>
    );
  }
  if (state.kind === "not_found") {
    return (
      <div className="bg-white border border-bf-ruby/30 rounded-2xl px-6 py-8 text-center w-full max-w-sm">
        <p className="label-ui text-bf-ruby mb-2">Not found</p>
        <p className="font-sans text-sm text-bf-gray-400 mb-5">
          That QR isn&apos;t on the list. Try the manual lookup below.
        </p>
        <Button variant="outline" onClick={onReset} className="w-full">
          Try again
        </Button>
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <div className="bg-white border border-bf-ruby/30 rounded-2xl px-6 py-8 text-center w-full max-w-sm">
        <p className="label-ui text-bf-ruby mb-2">Error</p>
        <p className="font-sans text-sm text-bf-gray-400 mb-5">
          {state.message}
        </p>
        <Button variant="outline" onClick={onReset} className="w-full">
          Try again
        </Button>
      </div>
    );
  }
  return null;
}

function formatWhen(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}
