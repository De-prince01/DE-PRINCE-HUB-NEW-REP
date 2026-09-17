import type { Metadata } from "next";
import Link from "next/link";
import SectionHeading from "@/components/marketing/section-heading";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Answers to common questions about DE-PRINCE DIGITAL HUB orders, payments, JAMB/NIN/BVN/CAC registration, delivery and refunds.",
};

const FAQ_GROUPS = [
  {
    title: "Orders & Payments",
    faqs: [
      { q: "How do I place an order?", a: "Create a free account, open the Service Console, choose a service, fill the request form, attach files if required and pay by transfer, card or wallet. You'll get an order number and can track it in your dashboard." },
      { q: "Which payment methods do you accept?", a: "Bank transfer, card payments and DE-PRINCE wallet. Wallet funding is instant and you can pay across services from one balance." },
      { q: "Why do you separate official fees from a service fee?", a: "For official services like NIN, BVN, CAC and JAMB we show the official fee and DE-PRINCE's transparent service fee separately so you always know exactly what you're paying for." },
      { q: "How do I get a refund?", a: "Open the support centre, create a ticket on the order and choose refund. Approved refunds go back to your wallet or original payment method within 3–5 working days." },
    ],
  },
  {
    title: "Registrations (JAMB, NIN, BVN, CAC, NYSC)",
    faqs: [
      { q: "Can you register me for JAMB completely online?", a: "Yes. We create your profile, handle registration, print your documents and deliver them — entirely online where eligible." },
      { q: "Is NIN registration biometric?", a: "NIN enrolment requires biometric capture at an official centre. We handle the entire process end-to-end and schedule your capture/in-store completion." },
      { q: "How long does CAC business registration take?", a: "Business name registration typically completes in a few business days. Company (RC) registration can take longer — our team tracks it and updates you." },
      { q: "Do you assist with NYSC registration?", a: "Yes — NYSC registration assistance, document upload, biometric steps and printing are available, especially during the seasonal window." },
    ],
  },
  {
    title: "Delivery & Pickup",
    faqs: [
      { q: "Do you deliver?", a: "Yes. Digital work is delivered to your dashboard/downloads instantly, and physical work (prints, binders, certificates) can be delivered in Gombe State." },
      { q: "Can I collect in store?", a: "Absolutely — choose pickup at checkout and collect at DE-PRINCE DIGITAL HUB, Federal University of Kashere, Akko LGA, Gombe State." },
      { q: "How do I track my order?", a: "Use /track with your receipt/order number, or sign in and open the order in your dashboard for live status, files and messages." },
    ],
  },
  {
    title: "Accounts & Privacy",
    faqs: [
      { q: "Is my data safe?", a: "Yes. We comply with Nigerian data protection requirements — data is encrypted in transit, processed on a lawful basis, stored for the shortest lawful period and you can export or delete it anytime in the Data Governance centre." },
      { q: "How do I delete my data?", a: "Open Privacy in your dashboard to manage purposes, export your data or submit a deletion request. Processing happens within legal timeframes." },
      { q: "Can I change my details after registration?", a: "Yes, edit your profile in the dashboard. For official records (NIN, CAC, etc.) the official authority's correction process applies." },
    ],
  },
];

export default function FAQPage() {
  const flatFaqs = FAQ_GROUPS.flatMap((g) => g.faqs);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: flatFaqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="container section-pad">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">Help Centre</p>
        <h1 className="section-title mt-3">Frequently Asked Questions</h1>
        <p className="mt-4 text-base leading-relaxed text-text-muted">
          Quick answers about orders, payments, registrations, delivery and privacy.
          Still stuck? Our team replies fast.
        </p>
      </section>

      <div className="mt-14 grid gap-10 lg:grid-cols-[1fr_1.4fr]">
        <aside className="space-y-3">
          <SectionHeading eyebrow="Browse" title="Jump to a topic" center={false} dark />
          <nav className="flex flex-wrap gap-2 lg:flex-col">
            {FAQ_GROUPS.map((g) => (
              <a
                key={g.title}
                href={`#${g.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                className="rounded-lg border border-gold/25 px-4 py-2 text-sm text-text-muted transition-colors hover:bg-gold/10 hover:text-gold-bright"
              >
                {g.title}
              </a>
            ))}
          </nav>
          <p className="pt-3 text-sm text-text-dim">
            Question not here?{" "}
            <Link href="/contact" className="text-gold hover:text-gold-bright">Contact us</Link> or
            join us on WhatsApp.
          </p>
        </aside>

        <div className="space-y-10">
          {FAQ_GROUPS.map((group) => (
            <section key={group.title} id={group.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}>
              <h2 className="font-display text-xl font-semibold text-white">{group.title}</h2>
              <div className="mt-4 divide-y divide-gold/10 rounded-xl border border-gold/20 bg-surface/40">
                {group.faqs.map((f) => (
                  <details key={f.q} className="group p-5">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-white">
                      {f.q}
                      <span className="text-gold transition-transform group-open:rotate-45">+</span>
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-text-muted">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}