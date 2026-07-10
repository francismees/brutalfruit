import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { EVENT_NAME } from "@/lib/milan-brunch/config";

export const metadata: Metadata = {
  title: "Competition Terms & Conditions",
  description:
    "Terms & Conditions for the Brutal Fruit Milan consumer competition.",
  robots: { index: false, follow: false },
};

export default function MilanBrunchTermsPage() {
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

      <main className="flex-1 px-5 pb-16 flex flex-col items-center">
        <article className="w-full max-w-2xl">
          <div className="text-center pt-4 pb-8">
            <p className="label-ui text-bf-ruby mb-4">
              Brutal Fruit Consumer Competition
            </p>
            <h1 className="heading-display-italic text-4xl sm:text-5xl text-bf-black">
              Terms &amp; Conditions
            </h1>
          </div>

          <p className="text-editorial text-bf-text-secondary text-base leading-relaxed mb-10">
            Participation in the Brutal Fruit {EVENT_NAME} Competition
            (&ldquo;Competition&rdquo;) is subject to acceptance of these Terms
            &amp; Conditions. By entering the Competition, participants
            acknowledge and agree to comply with the requirements below.
          </p>

          <TermsSection number="1" title="Terms and Conditions">
            <ul className="space-y-3 list-disc pl-5 marker:text-bf-ruby">
              <Item>
                The Competition is open to Tanzanian residents aged 18 years or
                older.
              </Item>
              <Item>Participants must have a valid and up-to-date passport.</Item>
              <Item>
                Winners are responsible for booking their own visa appointment,
                submitting their visa application, and covering all visa-related
                costs. TBL will provide supporting documentation where required.
              </Item>
              <Item>
                The prize (Trip to Milan) cannot be exchanged for cash and is not
                transferable.
              </Item>
              <Item>
                TBL reserves the right to disqualify any participant who provides
                false, misleading, or incomplete information.
              </Item>
              <Item>
                Employees of TBL, its agencies, and their immediate family
                members are not eligible to enter.
              </Item>
              <Item>
                TBL reserves the right to amend, suspend, or cancel the
                Competition at any time if required.
              </Item>
            </ul>
          </TermsSection>

          <TermsSection number="2" title="Competition Criteria">
            <p className="text-editorial text-bf-text-secondary text-base leading-relaxed mb-4">
              To be eligible for consideration as a winner, participants must:
            </p>
            <ul className="space-y-3 list-disc pl-5 marker:text-bf-ruby">
              <Item>
                Complete and submit the official Brutal Fruit {EVENT_NAME}{" "}
                Competition entry form through the designated Lead Generation Ad.
              </Item>
              <Item>
                Complete and submit the official Brutal Fruit {EVENT_NAME}{" "}
                Competition entry form.
              </Item>
              <Item>Provide accurate and complete contact information.</Item>
              <Item>
                Be 18 years of age or older and meet all eligibility requirements
                outlined in these Terms &amp; Conditions.
              </Item>
              <Item>Follow the official Brutal Fruit Africa social media pages.</Item>
              <Item>
                Include the hashtags #BrutalFruitTZ and #BrutallyBeautiful in
                their entry.
              </Item>
              <Item>
                Ensure all content reflects the Brutally Beautiful brand
                positioning and celebrates friendship, confidence, and positive
                experiences.
              </Item>
              <Item>
                Submit only original content. Entries containing fraudulent
                engagement or copied content may be disqualified.
              </Item>
            </ul>

            <p className="text-editorial text-bf-text-secondary text-base leading-relaxed mt-6 mb-4">
              Winner selection will be based on:
            </p>
            <ul className="space-y-3 list-disc pl-5 marker:text-bf-ruby">
              <Item>Creativity and originality.</Item>
              <Item>Brand alignment.</Item>
              <Item>Quality of content.</Item>
              <Item>Audience engagement.</Item>
              <Item>Adherence to competition requirements.</Item>
            </ul>

            <p className="text-editorial text-bf-text-secondary text-base leading-relaxed mt-6">
              TBL reserves the right to verify entries and request supporting
              information before confirming any winner.
            </p>
            <p className="text-editorial text-bf-text-secondary text-base leading-relaxed mt-4">
              TBL shall have the sole and final discretion in the selection of
              winners, and all decisions shall be final and binding.
            </p>
          </TermsSection>
        </article>
      </main>

      <Footer />
    </div>
  );
}

function TermsSection({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="heading-display text-xl sm:text-2xl text-bf-black mb-4">
        <span className="text-bf-ruby">{number}.</span> {title}
      </h2>
      {children}
    </section>
  );
}

function Item({ children }: { children: React.ReactNode }) {
  return (
    <li className="text-editorial text-bf-text-secondary text-base leading-relaxed">
      {children}
    </li>
  );
}
