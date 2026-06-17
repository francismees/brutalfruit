"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { rsvpSchema, type RsvpInput } from "@/lib/milan-brunch/validation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type DuplicateReason = "duplicate_email" | "duplicate_phone";

export function RsvpForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<{
    reason: DuplicateReason;
    email: string;
  } | null>(null);
  const [resendState, setResendState] = useState<
    "idle" | "sending" | "sent" | "rate_limited" | "error"
  >("idle");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RsvpInput>({
    resolver: zodResolver(rsvpSchema) as unknown as Resolver<RsvpInput>,
    defaultValues: { full_name: "", phone: "", email: "", hp_company: "" },
  });

  const onSubmit = async (values: RsvpInput) => {
    setServerError(null);
    setDuplicate(null);
    setResendState("idle");

    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (res.status === 409) {
        const body = (await res.json().catch(() => ({}))) as {
          reason?: DuplicateReason;
        };
        setDuplicate({
          reason: body.reason ?? "duplicate_email",
          email: values.email,
        });
        return;
      }

      if (res.status === 403) {
        setServerError("RSVPs are now closed.");
        return;
      }

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setServerError(body.error ?? "Something went wrong. Please try again.");
        return;
      }

      const { qr_token } = (await res.json()) as { qr_token: string };
      router.push(`/milan-brunch/confirmed?token=${qr_token}`);
    } catch {
      setServerError("Network hiccup. Please try again.");
    }
  };

  const handleResend = async () => {
    if (!duplicate) return;
    setResendState("sending");
    try {
      const res = await fetch("/api/resend-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: duplicate.email }),
      });
      if (res.status === 429) {
        setResendState("rate_limited");
        return;
      }
      if (!res.ok) {
        setResendState("error");
        return;
      }
      setResendState("sent");
    } catch {
      setResendState("error");
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="bg-white rounded-2xl border border-bf-gray-200/60 p-6 sm:p-8 shadow-sm space-y-4"
    >
      <Input
        label="Full name"
        type="text"
        autoComplete="name"
        placeholder="As it appears on your passport"
        {...register("full_name")}
        error={errors.full_name?.message}
      />

      <Input
        label="Phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="+255…"
        {...register("phone")}
        error={errors.phone?.message}
      />

      <Input
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        {...register("email")}
        error={errors.email?.message}
      />

      {/* Honeypot: invisible to humans, irresistible to bots */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-10000px",
          width: 1,
          height: 1,
          overflow: "hidden",
        }}
      >
        <label htmlFor="hp_company">Company</label>
        <input
          id="hp_company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          {...register("hp_company")}
        />
      </div>

      <Button
        type="submit"
        variant="gradient"
        className="w-full mt-2"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Saving your seat…" : "Confirm my spot"}
      </Button>

      {serverError && (
        <p className="text-xs text-bf-ruby font-sans text-center pt-1">
          {serverError}
        </p>
      )}

      {duplicate && (
        <div className="rounded-xl border border-bf-ruby/30 bg-bf-ruby/5 p-4 mt-3 text-center">
          <p className="font-sans text-sm text-bf-black mb-3">
            You&apos;re already on the list.
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleResend}
            disabled={resendState === "sending" || resendState === "sent"}
          >
            {resendState === "sending"
              ? "Sending…"
              : resendState === "sent"
              ? "Confirmation sent ✓"
              : "Resend my confirmation"}
          </Button>
          {resendState === "rate_limited" && (
            <p className="text-xs text-bf-ruby font-sans mt-2">
              One per minute, please. Try again shortly.
            </p>
          )}
          {resendState === "error" && (
            <p className="text-xs text-bf-ruby font-sans mt-2">
              Couldn&apos;t resend just now. Try again in a moment.
            </p>
          )}
        </div>
      )}

      <p className="text-[11px] font-sans text-bf-gray-400 text-center leading-relaxed pt-2">
        By RSVPing you agree to receive a confirmation email and a reminder about
        Milan Brunch. We never share your details.
      </p>
    </form>
  );
}
