"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import type { RsvpRow } from "./types";

type FilterMode = "all" | "checked_in" | "not_yet";

interface RsvpTableProps {
  rows: RsvpRow[];
}

export function RsvpTable({ rows }: RsvpTableProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");

  const stats = useMemo(() => {
    const total = rows.length;
    const checkedIn = rows.filter((r) => r.checked_in_at).length;
    const pct = total === 0 ? 0 : Math.round((checkedIn / total) * 100);
    return { total, checkedIn, pct };
  }, [rows]);

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (filter === "checked_in" && !r.checked_in_at) return false;
        if (filter === "not_yet" && r.checked_in_at) return false;
        if (!q) return true;
        return (
          r.full_name.toLowerCase().includes(q) ||
          r.phone_e164.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q)
        );
      });
  }, [rows, query, filter]);

  return (
    <div className="max-w-6xl mx-auto px-5 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="heading-display text-2xl text-bf-black">RSVPs</h1>
          <p className="font-sans text-xs text-bf-gray-400 mt-1">
            Live list — updates on refresh.
          </p>
        </div>
        <a
          href="/api/export-csv"
          className="btn-outline text-xs px-5"
          download
        >
          Export CSV
        </a>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total" value={stats.total.toString()} />
        <StatCard label="Checked in" value={stats.checkedIn.toString()} />
        <StatCard label="% Checked in" value={`${stats.pct}%`} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone, or email…"
            className="w-full px-4 py-2.5 rounded-xl border border-bf-gray-200 bg-white text-bf-text-primary font-sans text-sm placeholder:text-bf-gray-400 focus:outline-none focus:ring-2 focus:ring-bf-rosegold-flat focus:border-transparent transition-all"
          />
        </div>
        <div className="inline-flex rounded-full border border-bf-gray-200 bg-white p-1 self-start">
          {(
            [
              ["all", "All"],
              ["checked_in", "Checked in"],
              ["not_yet", "Not yet"],
            ] as Array<[FilterMode, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`px-4 py-1.5 rounded-full font-sans text-xs uppercase tracking-wider transition-colors ${
                filter === key
                  ? "bg-bf-rosegold-flat text-white"
                  : "text-bf-gray-400 hover:text-bf-black"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-bf-gray-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bf-cream/60">
              <tr className="text-left">
                <Th>Name</Th>
                <Th>Phone</Th>
                <Th>Email</Th>
                <Th>RSVP&apos;d</Th>
                <Th>Checked in</Th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center font-sans text-sm text-bf-gray-400"
                  >
                    No RSVPs match this view yet.
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-bf-gray-200/60 hover:bg-bf-cream/30 transition-colors"
                  >
                    <Td>
                      <span className="font-sans text-bf-black">
                        {row.full_name}
                      </span>
                    </Td>
                    <Td>
                      <a
                        href={`tel:${row.phone_e164}`}
                        className="font-sans text-bf-text-secondary hover:text-bf-ruby"
                      >
                        {row.phone_e164}
                      </a>
                    </Td>
                    <Td>
                      <a
                        href={`mailto:${row.email}`}
                        className="font-sans text-bf-text-secondary hover:text-bf-ruby break-all"
                      >
                        {row.email}
                      </a>
                    </Td>
                    <Td>
                      <span className="font-sans text-xs text-bf-gray-400 tabular-nums">
                        {formatWhen(row.created_at)}
                      </span>
                    </Td>
                    <Td>
                      {row.checked_in_at ? (
                        <Badge variant="success">
                          {formatWhen(row.checked_in_at)}
                        </Badge>
                      ) : (
                        <Badge variant="muted">Not yet</Badge>
                      )}
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="font-sans text-xs text-bf-gray-400 text-center">
        Showing {visibleRows.length} of {rows.length} RSVPs.
      </p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-bf-gray-200/60 px-5 py-4">
      <p className="label-ui text-bf-gray-400 mb-1">{label}</p>
      <p className="heading-display text-2xl text-bf-black tabular-nums">
        {value}
      </p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-5 py-3 label-ui text-bf-gray-400 font-medium">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-5 py-3 align-middle">{children}</td>;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
