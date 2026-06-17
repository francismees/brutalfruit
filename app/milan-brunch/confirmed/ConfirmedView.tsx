"use client";

import { Button } from "@/components/ui/Button";

interface ConfirmedViewProps {
  qrToken: string;
  name: string;
  email: string;
  venue: string;
  address: string;
  dateDisplay: string;
  dressCode: string;
  icsStartIso: string;
  icsEndIso: string;
  eventName: string;
}

export function ConfirmedView({
  qrToken,
  name,
  email,
  venue,
  address,
  dateDisplay,
  dressCode,
  icsStartIso,
  icsEndIso,
  eventName,
}: ConfirmedViewProps) {
  const handleAddToCalendar = () => {
    const ics = buildIcs({
      title: `Brutal Fruit · ${eventName}`,
      description: `RSVP for ${name}. Show your QR at the door.`,
      location: `${venue}, ${address}`,
      startIso: icsStartIso,
      endIso: icsEndIso,
      uid: qrToken,
    });
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "brutal-fruit-milan-brunch.ics";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="bg-white rounded-3xl border border-bf-gray-200/60 shadow-sm p-4 sm:p-5">
        <div className="relative w-full aspect-square rounded-2xl overflow-hidden border border-bf-gray-200/60 bg-[linear-gradient(135deg,#FDF8F4_0%,#FAF7F2_50%,#F8E8EC_100%)]">
          {/* Fallback — visible when no artwork file is present */}
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="font-sans text-xs uppercase tracking-[0.18em] text-bf-gray-400">
              Artwork placeholder
            </p>
          </div>
          {/* Overlay artwork — gracefully hides itself if the asset 404s */}
          <img
            src="/milan-brunch/artwork.jpg"
            alt="Brunch with Brutal Fruit"
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-bf-gray-200/60 shadow-sm p-6 sm:p-8 space-y-4">
        <div>
          <p className="label-ui text-bf-gray-400 mb-1">Venue</p>
          <p className="font-sans text-bf-black text-sm">{venue}</p>
          <p className="font-sans text-bf-text-secondary text-xs mt-0.5">
            {address}
          </p>
        </div>
        <div>
          <p className="label-ui text-bf-gray-400 mb-1">When</p>
          <p className="font-sans text-bf-black text-sm">{dateDisplay}</p>
        </div>
        <div>
          <p className="label-ui text-bf-gray-400 mb-1">Dress code</p>
          <p className="font-sans text-bf-black text-sm">{dressCode}</p>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleAddToCalendar}
      >
        Add to calendar
      </Button>

      <p className="text-xs font-sans text-bf-gray-400 text-center">
        Confirmation also sent to {email}.
      </p>
    </div>
  );
}

interface IcsParams {
  title: string;
  description: string;
  location: string;
  startIso: string;
  endIso: string;
  uid: string;
}

function buildIcs({
  title,
  description,
  location,
  startIso,
  endIso,
  uid,
}: IcsParams): string {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return (
      `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
      `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
    );
  };
  const escape = (s: string) =>
    s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,|;/g, (m) => `\\${m}`);

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Brutal Fruit//Milan Brunch//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}@brutalfruit.co.tz`,
    `DTSTAMP:${fmt(new Date().toISOString())}`,
    `DTSTART:${fmt(startIso)}`,
    `DTEND:${fmt(endIso)}`,
    `SUMMARY:${escape(title)}`,
    `DESCRIPTION:${escape(description)}`,
    `LOCATION:${escape(location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
