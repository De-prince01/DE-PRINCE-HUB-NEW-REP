"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Mail,
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  Send,
  Headphones,
  ArrowRight,
} from "lucide-react";
import { showToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const CHANNELS = [
  { icon: Phone, title: "Call us", value: "+234 800 000 0000", href: "tel:+2348000000000", note: "Mon – Sat, 8AM – 8PM" },
  { icon: MessageCircle, title: "WhatsApp", value: "Chat with support", href: "https://wa.me/2348000000000", note: "Fastest response" },
  { icon: Mail, title: "Email", value: "hello@deprincehub.com", href: "mailto:hello@deprincehub.com", note: "Replies within 24h" },
  { icon: MapPin, title: "Visit", value: "Iyana-Ipaja, Lagos", href: "/branches", note: "All branches" },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", category: "General Enquiry", message: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      showToast.error("Please fill in your name, email and message.");
      return;
    }
    setLoading(true);
    try {
      await api("/support/tickets", {
        method: "POST",
        body: JSON.stringify({
          subject: `${form.category}: ${form.name}`,
          category: form.category,
          priority: "normal",
          description: `${form.message}\n\nContact: ${form.name} ${form.phone ? `(${form.phone})` : ""} ${form.email}`,
        }),
      });
      showToast.success("Message sent! We'll get back to you shortly.");
      setForm({ name: "", email: "", phone: "", category: "General Enquiry", message: "" });
    } catch (err: any) {
      showToast.error(err.message || "Failed to send. Try WhatsApp instead.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container section-pad">
      <section className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">Contact Us</p>
        <h1 className="section-title mt-3">We&apos;d Love To Help</h1>
        <p className="mt-4 text-base leading-relaxed text-text-muted">
          Questions about a service, an order or a partnership? Reach us any way
          you like — we answer fast.
        </p>
      </section>

      <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CHANNELS.map((c) => (
          <a key={c.title} href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="card-premium block p-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-gold/15">
              <c.icon className="h-5 w-5 text-gold-bright" />
            </span>
            <h3 className="mt-4 font-display font-semibold text-white">{c.title}</h3>
            <p className="mt-1 text-sm font-medium text-gold-bright">{c.value}</p>
            <p className="mt-1 text-xs text-text-dim">{c.note}</p>
          </a>
        ))}
      </section>

      <section className="mt-14 grid gap-10 lg:grid-cols-[1.2fr_1fr]">
        <form onSubmit={submit} className="card-premium space-y-4 p-6 sm:p-8">
          <h2 className="font-display text-xl font-semibold text-white">Send us a message</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Your name"
              className="w-full rounded-lg border border-gold/30 bg-ink/50 px-4 py-3 text-sm text-white placeholder:text-text-dim focus:border-gold focus:outline-none"
            />
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              type="email"
              placeholder="Email address"
              className="w-full rounded-lg border border-gold/30 bg-ink/50 px-4 py-3 text-sm text-white placeholder:text-text-dim focus:border-gold focus:outline-none"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Phone (optional)"
              className="w-full rounded-lg border border-gold/30 bg-ink/50 px-4 py-3 text-sm text-white placeholder:text-text-dim focus:border-gold focus:outline-none"
            />
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full rounded-lg border border-gold/30 bg-ink/50 px-4 py-3 text-sm text-white focus:border-gold focus:outline-none"
            >
              {["General Enquiry", "Order Support", "Registration Help", "Partnership", "Academy", "Other"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <textarea
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            rows={5}
            placeholder="How can we help?"
            className="w-full rounded-lg border border-gold/30 bg-ink/50 px-4 py-3 text-sm text-white placeholder:text-text-dim focus:border-gold focus:outline-none"
          />
          <button type="submit" disabled={loading} className="btn-gold w-full sm:w-auto">
            <Send className="mr-2 h-4 w-4" />
            {loading ? "Sending..." : "Send Message"}
          </button>
          <p className="text-xs text-text-dim">
            Creating a message opens a support ticket on your account so the whole
            conversation stays in one thread. Signed out? Use WhatsApp or email —
            both work instantly.
          </p>
        </form>

        <aside className="space-y-4">
          <div className="card-premium p-6">
            <h3 className="flex items-center gap-2 font-display font-semibold text-white">
              <Clock className="h-4 w-4 text-gold" /> Opening Hours
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-text-muted">
              <li className="flex justify-between"><span>Monday – Saturday</span><span className="text-gold-bright">8:00 AM – 8:00 PM</span></li>
              <li className="flex justify-between"><span>Sunday</span><span className="text-gold-bright">Closed</span></li>
              <li className="flex justify-between"><span>Online ordering</span><span className="text-gold-bright">24/7</span></li>
            </ul>
          </div>
          <div className="card-premium p-6">
            <h3 className="flex items-center gap-2 font-display font-semibold text-white">
              <Headphones className="h-4 w-4 text-gold" /> Prefer self-service?
            </h3>
            <p className="mt-3 text-sm text-text-muted">
              The FAQ covers common questions about orders, payments, registrations and delivery.
            </p>
            <Link href="/faq" className="btn-ghost-gold mt-4">
              Read the FAQ <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </aside>
      </section>
    </div>
  );
}