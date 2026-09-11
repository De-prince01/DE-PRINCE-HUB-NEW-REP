"use client";

import { Toaster as HotToaster } from "react-hot-toast";

export function Toaster() {
  return (
    <HotToaster
      position="top-right"
      toastOptions={{
        style: {
          borderRadius: "8px",
          background: "#fff",
          color: "#1e1e1e",
        },
        success: {
          style: { borderLeft: "4px solid #16a34a" },
        },
        error: {
          style: { borderLeft: "4px solid #dc2626" },
        },
      }}
    />
  );
}
