import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import {
  EVENT_DISPLAY,
  EVENT_VENUE,
  PRIZE_HEADLINE,
  isRsvpOpen,
} from "@/lib/milan-brunch/config";
import { RsvpForm } from "./RsvpForm";

export const metadata: Metadata = {
  // `absolute` skips the root layout's "%s | Brutal Fruit Tanzania" template
  // so the tab + link preview read exactly as the campaign headline.
  title: { absolute: "Win a Trip to Milan" },
  description: "Brunch with Brutal Fruit — your seat, your chance.",
  openGraph: {
    title: "Win a Trip to Milan",
    description: "Brunch with Brutal Fruit — your seat, your chance.",
    url: "https://brutalfruit.co.tz/milan-brunch",
    siteName: "Brutal Fruit Tanzania",
    type: "website",
    images: [
      {
        url: "https://brutalfruit.co.tz/milan-brunch/artwork.jpg",
        width: 1200,
        height: 1200,
        alt: "Brunch with Brutal Fruit",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Win a Trip to Milan",
    description: "Brunch with Brutal Fruit — your seat, your chance.",
    images: ["https://brutalfruit.co.tz/milan-brunch/artwork.jpg"],
  },
};

export const dynamic = "force-dynamic";

export default function MilanBrunchPage() {
  const open = isRsvpOpen();

  return (
    <div className="min-h-screen bg-bf-blush flex flex-col">
      <header className="flex items-center justify-center px-5 pt-10 pb-5 sm:pt-14">
        <div
          className="w-36 h-6 bg-rosegold"
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
          <p className="label-ui text-bf-ruby mb-4">
            Offers you a chance to
          </p>
          <h1 className="heading-display-italic text-4xl sm:text-5xl text-bf-black mb-4">
            {PRIZE_HEADLINE}.
          </h1>
          <p className="text-editorial text-bf-text-secondary text-base sm:text-lg mb-7">
            Brunch with Brutal Fruit — your seat, your chance.
          </p>
          <div className="space-y-1 mb-6">
            <p className="text-editorial text-bf-text-secondary text-lg sm:text-xl font-normal whitespace-nowrap">
              Join us for brunch at {EVENT_VENUE}
            </p>
            <p className="text-editorial text-bf-text-secondary text-lg sm:text-xl font-normal whitespace-nowrap">
              {EVENT_DISPLAY}
            </p>
          </div>
          <p className="font-sans text-sm text-bf-gray-400 leading-relaxed">
            RSVP to claim your seat and your chance at Milan.
          </p>
        </section>

        <section className="w-full max-w-md">
          {open ? (
            <RsvpForm />
          ) : (
            <div className="bg-white rounded-2xl border border-bf-gray-200/60 p-8 text-center shadow-sm">
              <p className="heading-display text-xl text-bf-black mb-2">
                RSVPs closed, bestie.
              </p>
              <p className="text-editorial text-bf-text-secondary text-sm">
                Catch us next round.
              </p>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
