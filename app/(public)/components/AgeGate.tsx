"use client";

import { useAgeGate } from "@/hooks/useAgeGate";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/Button";

export function AgeGate() {
  const { isVerified, verify, deny } = useAgeGate();

  // Still loading from localStorage
  if (isVerified === null) {
    return (
      <div className="fixed inset-0 z-[100] bg-bf-blush" />
    );
  }

  // Already verified
  if (isVerified) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-bf-blush flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md text-center animate-fade-in-up">
        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <div 
            className="w-48 h-8 bg-rosegold" 
            style={{ 
              WebkitMaskImage: 'url(/bf-logo-wordmark.svg)', 
              WebkitMaskSize: 'contain', 
              WebkitMaskRepeat: 'no-repeat', 
              WebkitMaskPosition: 'center',
              maskImage: 'url(/bf-logo-wordmark.svg)',
              maskSize: 'contain',
              maskRepeat: 'no-repeat',
              maskPosition: 'center',
            }} 
            title="Brutal Fruit"
          />
        </div>

        {/* Divider */}
        <div className="w-12 h-[2px] bg-bf-gray-200 mx-auto mb-8" />

        {/* Headline */}
        <h2 className="heading-display text-3xl md:text-[2.5rem] leading-tight mb-4">
          Experience the{" "}
          <em className="heading-display-italic">sparkle</em>
          <br />
          of sophisticated
          <br />
          refreshment.
        </h2>

        {/* Subtitle */}
        <p className="text-editorial text-bf-text-secondary text-lg mb-10">
          You must be of legal drinking age to enter this site.
        </p>

        {/* Buttons */}
        <div className="flex flex-col gap-3 mb-12">
          <Button
            variant="gradient"
            onClick={verify}
            className="w-full text-base py-5"
            id="age-gate-confirm"
          >
            YES, I&apos;M 18+
          </Button>
          <Button
            variant="outline"
            onClick={deny}
            className="w-full text-base py-5"
            id="age-gate-deny"
          >
            NO
          </Button>
        </div>

        {/* Legal */}
        <p className="label-ui text-bf-gray-400 text-[0.65rem] tracking-widest mb-4">
          NOT FOR SALE TO PERSONS UNDER THE AGE OF 18.
          <br />
          <span style={{ color: "var(--bf-rosegold-flat)" }}>
            ENJOY RESPONSIBLY.
          </span>
        </p>

        {/* Links */}
        <nav className="flex items-center justify-center gap-4">
          <a
            href="#"
            className="label-ui text-bf-gray-400 text-[0.65rem] hover:text-bf-black transition-colors"
          >
            PRIVACY POLICY
          </a>
          <span className="text-bf-gray-200 text-xs">•</span>
          <a
            href="#"
            className="label-ui text-bf-gray-400 text-[0.65rem] hover:text-bf-black transition-colors"
          >
            COOKIE POLICY
          </a>
        </nav>
      </div>
    </div>
  );
}
