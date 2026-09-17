import type { Metadata } from "next";
import Link from "next/link";
import {
  GraduationCap,
  Monitor,
  Keyboard,
  Palette,
  Code,
  Award,
  Users,
  Clock,
  BookOpen,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import SectionHeading from "@/components/marketing/section-heading";

export const metadata: Metadata = {
  title: "DE-PRINCE Academy",
  description:
    "Practical digital skills training — computer appreciation, typing, design, web development and more at DE-PRINCE Academy.",
};

const COURSES = [
  { icon: Monitor, title: "Computer Appreciation", level: "Beginner", hours: "4 weeks", desc: "PC basics, file management, internet and office readiness." },
  { icon: Keyboard, title: "Typing & Word Processing", level: "Beginner", hours: "3 weeks", desc: "Fast, accurate typing and professional document formatting." },
  { icon: Palette, title: "Graphic Design", level: "Intermediate", hours: "6 weeks", desc: "Canva + industry tools: flyers, logos and social media graphics." },
  { icon: Code, title: "Web Development", level: "Advanced", hours: "12 weeks", desc: "HTML, CSS, JavaScript and building real websites." },
  { icon: BookOpen, title: "Data Entry & Office Skills", level: "Beginner", hours: "4 weeks", desc: "Practical office and data-entry skills for work readiness." },
  { icon: GraduationCap, title: "Digital Literacy Certificate", level: "All levels", hours: "2 weeks", desc: "A short, certified course covering safe and effective digital life." },
];

export default function AcademyPage() {
  return (
    <div className="container section-pad">
      <section className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">DE-PRINCE Academy</p>
        <h1 className="section-title mt-3">Learn The Skills That Pay</h1>
        <p className="mt-4 text-base leading-relaxed text-text-muted">
          Hands-on digital training taught by the people who run the hub — practical,
          project-based, and certificated.
        </p>
      </section>

      <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {COURSES.map((c) => (
          <div key={c.title} className="card-premium flex flex-col p-6">
            <div className="flex items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-gold/15">
                <c.icon className="h-5 w-5 text-gold-bright" />
              </span>
              <span className="rounded-full bg-gold/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold">{c.level}</span>
            </div>
            <h3 className="mt-4 font-display font-semibold text-white">{c.title}</h3>
            <p className="mt-1 flex items-center gap-1 text-xs text-gold"><Clock className="h-3 w-3" /> {c.hours}</p>
            <p className="mt-3 flex-1 text-sm text-text-muted">{c.desc}</p>
            <Link href="/contact" className="btn-gold mt-5 justify-center py-2 text-sm">
              Enquire now <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
        ))}
      </section>

      <section className="mt-16">
        <div className="rounded-2xl border border-gold/25 bg-gradient-to-r from-gold/10 via-transparent to-gold/10 p-10">
          <div className="grid items-center gap-8 md:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="eyebrow">Why the Academy</p>
              <h2 className="font-display text-2xl font-bold text-white">Training that ends in work</h2>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                Every course is practical-first. You complete real projects, get
                feedback from working professionals, and finish with a certificate
                — plus a head start towards freelancing on the DE-PRINCE
                marketplace.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  { icon: Award, t: "Certificate on completion" },
                  { icon: Users, t: "Small classes, real attention" },
                  { icon: Monitor, t: "Learn on our machines" },
                  { icon: BookOpen, t: "Lifetime course repos" },
                ].map((f) => (
                  <div key={f.t} className="flex items-center gap-2 text-sm text-text-muted">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-gold" /> {f.t}
                  </div>
                ))}
              </div>
              <Link href="/contact" className="btn-gold mt-7">
                Contact the Academy <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { v: "20+", l: "Courses & Labs" },
                { v: "1,200+", l: "Students Trained" },
                { v: "90%", l: "Practical Hours" },
                { v: "4.9", l: "Average Rating" },
              ].map((s) => (
                <div key={s.l} className="card-premium p-5 text-center">
                  <p className="font-display text-3xl font-bold text-gold-bright">{s.v}</p>
                  <p className="mt-1 text-xs text-text-dim">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}