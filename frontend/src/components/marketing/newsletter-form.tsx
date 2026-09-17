"use client";

import { useState } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { showToast } from "@/hooks/use-toast";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast.error("Enter a valid email address");
      return;
    }
    setLoading(true);
    // No public newsletter backend — store locally and confirm.
    await new Promise((r) => setTimeout(r, 500));
    try {
      const existing = JSON.parse(localStorage.getItem("deprince_newsletter") || "[]");
      localStorage.setItem(
        "deprince_newsletter",
        JSON.stringify([...existing.filter((e: string) => e !== email), email].slice(-20))
      );
    } catch {
      /* ignore storage errors */
    }
    setDone(true);
    setLoading(false);
    showToast.success("Subscribed! Watch your inbox.");
  };

  if (done) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
        <CheckCircle2 className="h-5 w-5" />
        You're on the list. Welcome to DE-PRINCE DIGITAL HUB.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email address"
        className="w-full rounded-lg border border-gold/30 bg-ink/60 px-4 py-3 text-sm text-white placeholder:text-text-dim focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
      />
      <button
        type="submit"
        disabled={loading}
        className="btn-gold shrink-0 px-6"
      >
        <Send className="mr-2 h-4 w-4" />
        {loading ? "Subscribing..." : "Subscribe"}
      </button>
    </form>
  );
}