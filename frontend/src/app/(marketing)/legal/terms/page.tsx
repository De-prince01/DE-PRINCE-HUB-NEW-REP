import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern your use of the DE-PRINCE DIGITAL HUB platform and its digital services.",
};

export default function TermsPage() {
  return (
    <div className="container section-pad max-w-3xl">
      <p className="eyebrow">Legal</p>
      <h1 className="section-title mt-3">Terms of Service</h1>
      <p className="mt-3 text-sm text-text-dim">Last updated: January 2026</p>

      <div className="prose-invert mt-10 space-y-8 text-sm leading-relaxed text-text-muted">
        <section>
          <h2 className="font-display text-lg font-semibold text-white">1. Agreement</h2>
          <p className="mt-2">
            By creating an account or using DE-PRINCE DIGITAL HUB services you agree
            to these Terms. If you do not agree, please do not use the platform.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">2. The Services</h2>
          <p className="mt-2">
            We provide digital services including registrations (JAMB, NIN, BVN, CAC,
            NYSC and others), printing, binding, design, development, computer
            services and document processing — online, in-store or delivered. Where a
            service involves an official authority, our fee is separate from, and
            clearly shown alongside, any official fee.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">3. Acceptable Use</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>You must provide accurate information and genuine documents.</li>
            <li>You must not use the platform for anything unlawful or fraudulent.</li>
            <li>You are responsible for the security of your account credentials.</li>
            <li>You must not resell or misuse official services offered through us.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">4. Orders & Payments</h2>
          <p className="mt-2">
            Orders are confirmed when accepted and paid. Prices are shown in Naira
            before checkout. Wallet balances are not interest-bearing. Where a
            quotation is required, the final price is confirmed before work begins.
            Changing or amending an official registration after submission may incur
            the official authority&apos;s correction fee plus our handling fee.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">5. Delivery & Completion</h2>
          <p className="mt-2">
            Estimated times are indicative. Digital deliverables are made available
            in your account; physical deliverables are available for pickup or
            delivery as selected. Delays caused by third-party authorities are
            communicated through your order thread.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">6. Refunds</h2>
          <p className="mt-2">
            Approved refunds are processed back to your wallet or original payment
            method within 3–5 working days. Refund eligibility is described in our
            separate Refund Policy, which forms part of these Terms.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">7. Liability</h2>
          <p className="mt-2">
            We process services with reasonable skill and care, but we are not liable
            for decisions, denials or delays made by official authorities, or for
            indirect losses. Nothing in these Terms limits rights you cannot waive by
            law.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">8. Changes</h2>
          <p className="mt-2">
            We may update these Terms. Material changes are communicated through the
            platform. Continued use after changes are posted constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">9. Contact</h2>
          <p className="mt-2">
            Legal or service queries: <a href="mailto:deprince969@gmail.com" className="text-gold hover:text-gold-bright">deprince969@gmail.com</a>.
          </p>
        </section>
      </div>
    </div>
  );
}