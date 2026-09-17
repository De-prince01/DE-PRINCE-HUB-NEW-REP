import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How DE-PRINCE DIGITAL HUB collects, uses, protects and deletes your personal data in line with Nigerian data protection law.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container section-pad max-w-3xl">
      <p className="eyebrow">Legal</p>
      <h1 className="section-title mt-3">Privacy Policy</h1>
      <p className="mt-3 text-sm text-text-dim">Last updated: January 2026</p>

      <div className="prose-invert mt-10 space-y-8 text-sm leading-relaxed text-text-muted">
        <section>
          <h2 className="font-display text-lg font-semibold text-white">1. Who We Are</h2>
          <p className="mt-2">
            DE-PRINCE DIGITAL HUB (&ldquo;we&rdquo;, &ldquo;us&rdquo;) operates an
            online and physical digital-service platform connecting customers with
            registrations, document, printing, design, development and computer
            services. This policy explains how we handle personal data.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">2. Data We Collect</h2>
          <p className="mt-2">We collect only what is needed to deliver and improve services:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Account details — name, email, phone, password (hashed).</li>
            <li>Service data — the documents, images, IDs and instructions needed for a request.</li>
            <li>Payment and order records — references and transaction history (not card numbers).</li>
            <li>Identity data where a service legally requires it (e.g. NIN, BVN, CAC records), held separately and access-controlled.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">3. Why We Process It</h2>
          <p className="mt-2">
            We process personal data to perform our contract with you, to comply with
            official registration requirements, for legitimate business operation
            (fraud prevention, quality, analytics) and — with consent — for
            marketing. Full purpose-by-purpose disclosure is available in your
            account&apos;s Data Governance centre.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">4. Sharing & Protection</h2>
          <p className="mt-2">
            We share data only with the official authorities required to complete a
            service (e.g. JAMB, NIMC, CBN-authorised BVN gateways, CAC) and with
            workers assigned to your order under strict confidentiality. Data is
            encrypted in transit, access-controlled, and retained only for the
            shortest lawful period — after which it is deleted or archived as the
            law requires.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">5. Your Rights</h2>
          <p className="mt-2">
            You may access, correct, export and request deletion of your data at any
            time. Use the Privacy section in your dashboard to manage consent, view
            purposes, export your data or submit a deletion request. We act on valid
            requests within the timeframes set by law.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">6. Cookies & Analytics</h2>
          <p className="mt-2">
            We use essential cookies for authentication and optional analytics to
            understand site use. You can disable non-essential tracking in your
            browser settings.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">7. Contact</h2>
          <p className="mt-2">
            Privacy questions: <a href="mailto:deprince969@gmail.com" className="text-gold hover:text-gold-bright">deprince969@gmail.com</a>.
          </p>
        </section>
      </div>
    </div>
  );
}