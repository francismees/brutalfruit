"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { marked } from "marked";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import type { AudienceCounts, MessageLogRow, SampleRecipient } from "./types";

marked.setOptions({ gfm: true, breaks: true });

type Audience = "all" | "checked_in" | "not_checked_in";

interface CommsViewProps {
  counts: AudienceCounts;
  sampleRecipient: SampleRecipient | null;
  messages: MessageLogRow[];
}

const AUDIENCE_LABEL: Record<Audience, string> = {
  all: "Everyone",
  checked_in: "Checked in",
  not_checked_in: "Not checked in",
};

export function CommsView({ counts, sampleRecipient, messages }: CommsViewProps) {
  const router = useRouter();
  const [audience, setAudience] = useState<Audience>("all");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState(
    "Hey {{first_name}},\n\nThanks for being part of Brutal Fruit Milan Brunch.\n\n— The Brutal Fruit Team"
  );
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const previewHtml = useMemo(() => {
    const firstName = sampleRecipient?.full_name?.split(/\s+/)[0] ?? "bestie";
    const merged = body.replaceAll("{{first_name}}", firstName);
    return marked.parse(merged, { async: false }) as string;
  }, [body, sampleRecipient]);

  const recipientCount = counts[audience];

  const canSend =
    subject.trim().length > 0 && body.trim().length > 0 && recipientCount > 0;

  const send = async () => {
    setSending(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/comms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "email",
          audience,
          subject: subject.trim(),
          body,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        sent?: number;
        error?: string;
      };
      if (!res.ok) {
        setFeedback(data.error ?? "Send failed.");
        return;
      }
      setFeedback(`Sent to ${data.sent ?? recipientCount} recipients.`);
      setSubject("");
      // Soft-refresh the server data so the history table updates.
      router.refresh();
    } catch (err) {
      setFeedback(
        err instanceof Error ? err.message : "Unexpected error while sending."
      );
    } finally {
      setSending(false);
      setConfirmOpen(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-5 py-8 space-y-8">
      <div>
        <h1 className="heading-display text-2xl text-bf-black">Comms</h1>
        <p className="font-sans text-xs text-bf-gray-400 mt-1">
          Markdown is supported. Use <code>{"{{first_name}}"}</code> to merge.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="label-ui text-bf-gray-400 block mb-2">
              Audience
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["all", "checked_in", "not_checked_in"] as Audience[]).map(
                (a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAudience(a)}
                    className={`rounded-2xl border px-3 py-3 text-left transition-colors ${
                      audience === a
                        ? "border-bf-rosegold-flat bg-bf-rosegold-flat/5"
                        : "border-bf-gray-200 bg-white hover:border-bf-gray-400"
                    }`}
                  >
                    <p className="font-sans text-xs uppercase tracking-wider text-bf-gray-400">
                      {AUDIENCE_LABEL[a]}
                    </p>
                    <p className="heading-display text-xl text-bf-black tabular-nums mt-1">
                      {counts[a]}
                    </p>
                  </button>
                )
              )}
            </div>
          </div>

          <Input
            label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="A note from Brutal Fruit"
          />

          <div>
            <label className="label-ui text-bf-gray-400 block mb-1.5">
              Body (markdown)
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              className="w-full px-4 py-3 rounded-xl border border-bf-gray-200 bg-white text-bf-text-primary font-sans text-sm focus:outline-none focus:ring-2 focus:ring-bf-rosegold-flat focus:border-transparent transition-all"
            />
          </div>

          <Button
            variant="gradient"
            disabled={!canSend || sending}
            onClick={() => setConfirmOpen(true)}
            className="w-full"
          >
            {sending
              ? "Sending…"
              : `Send to ${recipientCount} ${
                  recipientCount === 1 ? "person" : "people"
                }`}
          </Button>

          {feedback && (
            <p className="font-sans text-xs text-bf-text-secondary text-center">
              {feedback}
            </p>
          )}
        </div>

        <div>
          <p className="label-ui text-bf-gray-400 mb-2">
            Preview {sampleRecipient ? `· ${sampleRecipient.full_name}` : ""}
          </p>
          <div className="bg-[#1a0d15] rounded-2xl border border-bf-gray-200/30 p-6 text-bf-cream space-y-3 text-sm font-sans leading-relaxed min-h-[320px]">
            {subject && (
              <p className="font-sans text-xs uppercase tracking-wider text-bf-rosegold-start">
                {subject}
              </p>
            )}
            <div
              className="prose prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
          <p className="font-sans text-[11px] text-bf-gray-400 mt-2 text-center">
            Preview only — the final email uses the brand-styled wrapper.
          </p>
        </div>
      </div>

      <div>
        <h2 className="heading-display text-xl text-bf-black mb-3">History</h2>
        <div className="bg-white rounded-2xl border border-bf-gray-200/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bf-cream/60">
                <tr className="text-left">
                  <Th>Sent</Th>
                  <Th>By</Th>
                  <Th>Audience</Th>
                  <Th>Channel</Th>
                  <Th>Subject</Th>
                  <Th>Recipients</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {messages.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-8 text-center font-sans text-sm text-bf-gray-400"
                    >
                      Nothing sent yet.
                    </td>
                  </tr>
                ) : (
                  messages.map((m) => (
                    <tr
                      key={m.id}
                      className="border-t border-bf-gray-200/60 align-middle"
                    >
                      <Td>
                        <span className="font-sans text-xs text-bf-gray-400 tabular-nums">
                          {formatWhen(m.created_at)}
                        </span>
                      </Td>
                      <Td>
                        <span className="font-sans text-xs text-bf-text-secondary">
                          {m.sent_by}
                        </span>
                      </Td>
                      <Td>
                        <Badge variant="muted">
                          {AUDIENCE_LABEL[m.audience]}
                        </Badge>
                      </Td>
                      <Td>
                        <Badge
                          variant={m.channel === "email" ? "rosegold" : "ruby"}
                        >
                          {m.channel}
                        </Badge>
                      </Td>
                      <Td>
                        <span className="font-sans text-sm text-bf-black truncate max-w-[260px] block">
                          {m.subject ?? "—"}
                        </span>
                      </Td>
                      <Td>
                        <span className="font-sans text-sm text-bf-black tabular-nums">
                          {m.recipient_count}
                        </span>
                      </Td>
                      <Td>
                        <Badge
                          variant={m.status === "sent" ? "success" : "ruby"}
                        >
                          {m.status}
                        </Badge>
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Send this email?"
      >
        <div className="space-y-5">
          <p className="font-sans text-sm text-bf-gray-700">
            Sending <strong>{subject || "(no subject)"}</strong> to{" "}
            <strong>{recipientCount}</strong> recipient
            {recipientCount === 1 ? "" : "s"} in the{" "}
            <strong>{AUDIENCE_LABEL[audience]}</strong> audience.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              className="flex-1"
              disabled={sending}
            >
              Cancel
            </Button>
            <Button
              variant="gradient"
              onClick={send}
              className="flex-1"
              disabled={sending}
            >
              {sending ? "Sending…" : "Send"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 label-ui text-bf-gray-400 font-medium whitespace-nowrap">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3">{children}</td>;
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
