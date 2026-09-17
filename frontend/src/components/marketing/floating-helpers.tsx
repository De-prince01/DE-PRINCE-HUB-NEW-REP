"use client";

import { useEffect, useState } from "react";
import { ArrowUp, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function FloatingHelpers() {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Scroll to top"
        className={cn(
          "fixed bottom-5 left-5 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full border border-gold/40 bg-charcoal text-gold shadow-lg transition-all hover:bg-gold hover:text-ink",
          showTop ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
        )}
      >
        <ArrowUp className="h-5 w-5" />
      </button>
      <a
        href="https://wa.me/2347011112229?text=Hello%20DE-PRINCE%20DIGITAL%20HUB"
        target="_blank"
        rel="noreferrer"
        aria-label="Chat on WhatsApp"
        className="fixed bottom-5 right-5 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-gold-bright via-gold to-gold-deep text-ink shadow-[0_0_25px_rgba(212,168,75,0.5)] transition-transform hover:scale-110"
      >
        <MessageCircle className="h-6 w-6" />
      </a>
    </>
  );
}