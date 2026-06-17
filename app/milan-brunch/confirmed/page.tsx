import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  EVENT_DATE_END_ISO,
  EVENT_DATE_ISO,
  EVENT_DISPLAY,
  EVENT_FULL_ADDRESS,
  EVENT_NAME,
  EVENT_VENUE,
  DRESS_CODE,
  PUBLIC_ROUTE,
} from "@/lib/milan-brunch/config";
import { Footer } from "@/components/Footer";
import { ConfirmedView } from "./ConfirmedView";

export const metadata: Metadata = {
  title: "You're in — Milan Brunch",
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ConfirmedPage({ searchParams }: PageProps) {
  const { token } = await searchParams;

  if (!token) redirect(PUBLIC_ROUTE);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("milan_brunch_rsvps")
    .select("qr_token, full_name, email, checked_in_at")
    .eq("qr_token", token)
    .maybeSingle();

  if (error || !data) redirect(PUBLIC_ROUTE);

  return (
    <div className="min-h-screen bg-bf-blush flex flex-col">
      <header className="flex items-center justify-center px-5 py-5">
        <div
          className="w-32 h-5 bg-rosegold"
          style={{
            WebkitMaskImage: "url(/bf-logo-wordmark.svg)",
            WebkitMaskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskImage: "url(/bf-logo-wordmark.svg)",
            maskSize: "contain",
            maskRepeat: "no-repeat",
            maskPosition: "center",
          }}
          title="Brutal Fruit"
        />
      </header>

      <main className="flex-1 px-5 pb-12 flex flex-col items-center">
        <section className="w-full max-w-md text-center pt-4 pb-8">
          <p className="label-ui text-bf-ruby mb-3">RSVP confirmed</p>
          <h1 className="heading-display-italic text-4xl sm:text-5xl text-bf-black mb-3">
            You&apos;re in, bestie.
          </h1>
          <p className="text-editorial text-bf-text-secondary text-base">
            {EVENT_VENUE} · Saturday 20 June · 11am
          </p>
        </section>

        <ConfirmedView
          qrToken={data.qr_token}
          name={data.full_name}
          email={data.email}
          venue={EVENT_VENUE}
          address={EVENT_FULL_ADDRESS}
          dateDisplay={EVENT_DISPLAY}
          dressCode={DRESS_CODE}
          icsStartIso={EVENT_DATE_ISO}
          icsEndIso={EVENT_DATE_END_ISO}
          eventName={EVENT_NAME}
        />
      </main>

      <Footer />
    </div>
  );
}
