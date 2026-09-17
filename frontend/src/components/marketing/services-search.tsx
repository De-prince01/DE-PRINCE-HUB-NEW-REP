"use client";

import { Search } from "lucide-react";

export default function ServicesSearch() {
  return (
    <div className="mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-xl border border-gold/25 bg-surface/50 px-4 py-3">
      <Search className="h-5 w-5 text-gold" />
      <input
        placeholder="Search for anything — JAMB, NIN, binding, logo..."
        className="w-full bg-transparent text-sm text-white placeholder:text-text-dim focus:outline-none"
        onChange={(e) => {
          const q = (e.target.value || "").toLowerCase().trim();
          document.querySelectorAll<HTMLElement>("[data-cat]").forEach((el) => {
            const label = el.dataset.cat || "";
            el.style.display = label.includes(q) ? "" : "none";
          });
        }}
      />
    </div>
  );
}