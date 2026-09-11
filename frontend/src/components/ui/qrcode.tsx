"use client";

import { useMemo } from "react";
import qrcode from "@/lib/vendor/qrcode-generator";

interface QrCodeProps {
  value: string;
  size?: number;
  className?: string;
}

export function QrCode({ value, size = 128, className }: QrCodeProps) {
  const svg = useMemo(() => {
    if (!value) return null;
    const qr = qrcode(5, "M");
    qr.addData(value);
    qr.make();
    const cellSize = Math.max(2, Math.floor(size / qr.getModuleCount()));
    return qr.createSvgTag({
      cellSize,
      margin: 2,
      scalable: false,
      alt: { text: "QR code" },
      title: { text: "Scan to verify" },
    });
  }, [value, size]);

  if (!svg) return null;

  return (
    <div
      className={className}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
