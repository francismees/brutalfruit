import { AgeGate } from "../(public)/components/AgeGate";

/**
 * Wraps every /milan-brunch route (form + confirmed page) so the same
 * 18+ gate the rest of the public site uses also fronts the RSVP funnel.
 * AgeGate's verification state is shared via localStorage, so anyone who
 * already passed the gate elsewhere on brutalfruit.co.tz is not prompted
 * twice.
 */
export default function MilanBrunchLayout({
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
