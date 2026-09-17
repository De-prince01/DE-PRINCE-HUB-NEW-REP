import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy",
  description:
    "DE-PRINCE DIGITAL HUB refund policy — when you can request a refund, how it's processed and what isn't refundable.",
};

export default function RefundPage() {
  return (
    <div className="container section-pad max-w-3xl">
      <p className="eyebrow">Legal</p>
      <h1 className="section-title mt-3">Refund Policy</h1>
      <p className="mt-3 text-sm text-text-dim">Last updated: January 2026</p>

      <div className="prose-invert mt-10 space-y-8 text-sm leading-relaxed text-text-muted">
        <section>
          <h2 className="font-display text-lg font-semibold text-white">1. When You Can Get A Refund</h2>
          <p className="mt-2">You may be eligible for a refund when:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>An order you paid for was not completed through no fault of yours.</li>
            <li>We delivered work materially different from what was agreed in writing.</li>
            <li>An official service could not be processed and cannot be revised.</li>
            <li>You cancel within a permitted window before work has started.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">2. What Is Not Refundable</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Official fees already paid to and retained by an authority.</li>
            <li>Work fully completed and delivered as agreed.</li>
            <li>Digital deliverables downloaded in full.</li>
            <li>Orders cancelled after processing has begun (a partial refund may apply).</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">3. How To Request A Refund</h2>
          <p className="mt-2">
            Open the Support Centre in your dashboard, create a ticket on the order,
            and choose the refund request option. Include your reason — our team
            reviews, may ask clarifying questions, and responds within 2 working days.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">4. Processing</h2>
          <p className="mt-2">
            Approved refunds are credited to your DE-PRINCE wallet instantly, or to
            the original payment method within 3–5 working days depending on the bank.
            Service fees for partially completed work may be retained proportionally.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white">5. Disputes</h2>
          <p className="mt-2">
            If you disagree with a refund decision, reply to your ticket to escalate.
            We aim to resolve disputes fairly within 7 working days.
          </p>
        </section>
      </div>
    </div>
  );
}