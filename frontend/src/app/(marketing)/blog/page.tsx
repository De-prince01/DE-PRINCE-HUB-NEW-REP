import type { Metadata } from "next";
import { CalendarDays, ArrowRight, BookOpen } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog & Guides",
  description:
    "Guides and updates from DE-PRINCE DIGITAL HUB — JAMB registration deadlines, NIN/BVN tips, digital skills and more.",
};

const POSTS = [
  {
    slug: "jamb-2026-registration-guide",
    category: "Registrations",
    title: "JAMB/UTME 2026: Complete Registration Guide & Costs",
    excerpt: "Everything you need to register for JAMB/UTME — profile creation, PIN, documents, biometric steps and how to do it all online with DE-PRINCE.",
    date: "2026-01-08",
    read: "6 min read",
  },
  {
    slug: "nin-vs-bvn-whats-the-difference",
    category: "Identity",
    title: "NIN vs BVN: What's The Difference And Why You Need Both",
    excerpt: "The National Identification Number and Bank Verification Number are two of Nigeria's most important identity numbers. Here's how they differ.",
    date: "2026-02-12",
    read: "5 min read",
  },
  {
    slug: "start-a-business-cac-checklist",
    category: "Business",
    title: "Starting A Business In Nigeria: The CAC Checklist",
    excerpt: "A step-by-step breakdown of business name registration, company registration, documents and timelines — with what it actually costs.",
    date: "2026-03-03",
    read: "8 min read",
  },
  {
    slug: "nysc-registration-timeline",
    category: "NYSC",
    title: "NYSC Registration: Dates, Steps And Pitfalls To Avoid",
    excerpt: "Know the seasonal window, the upload requirements and the small mistakes that get corps members delayed.",
    date: "2026-04-20",
    read: "7 min read",
  },
  {
    slug: "passport-booking-guide",
    category: "Travel",
    title: "Passport Booking In Nigeria: How To Navigate The NIS Portal",
    excerpt: "Booking an appointment, picking a centre and filling the application can be stressful. This guide walks through the whole flow.",
    date: "2026-05-15",
    read: "6 min read",
  },
  {
    slug: "digital-typing-skills-employment",
    category: "Academy",
    title: "Why Typing & Computer Skills Still Get People Hired",
    excerpt: "Digital literacy remains one of the cheapest, fastest ways to improve employability. Start with these courses.",
    date: "2026-06-10",
    read: "4 min read",
  },
];

export default function BlogPage() {
  return (
    <div className="container section-pad">
      <section className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">Blog & Guides</p>
        <h1 className="section-title mt-3">Guides From The Hub</h1>
        <p className="mt-4 text-base leading-relaxed text-text-muted">
          Practical how-tos and updates on registrations, identity, business and
          digital skills — written by the people who process them every day.
        </p>
      </section>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {POSTS.map((p) => (
          <article key={p.slug} className="card-premium group flex flex-col overflow-hidden">
            <div className="flex h-40 items-center justify-center bg-gradient-to-br from-charcoal to-ink">
              <BookOpen className="h-10 w-10 text-gold/60 transition-transform group-hover:scale-110" />
            </div>
            <div className="flex flex-1 flex-col p-6">
              <div className="flex items-center gap-3 text-xs text-text-dim">
                <span className="rounded-full bg-gold/10 px-2 py-0.5 font-semibold text-gold">{p.category}</span>
                <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {p.date}</span>
                <span>{p.read}</span>
              </div>
              <h2 className="mt-3 font-display text-lg font-semibold leading-snug text-white">
                {p.title}
              </h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-text-muted line-clamp-3">{p.excerpt}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-gold group-hover:underline">
                Read guide <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}