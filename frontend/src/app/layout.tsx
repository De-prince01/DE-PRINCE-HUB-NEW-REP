import type { Metadata, Viewport } from "next";
import { Montserrat, Cinzel } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/toaster";
import { SITE_URL } from "@/lib/utils";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-body",
});

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "DE-PRINCE DIGITAL HUB | Everything Digital. One Platform.",
    template: "%s | DE-PRINCE DIGITAL HUB",
  },
  description:
    "Everything Digital. One Platform. Printing, computer services, web development, graphic design, JAMB/NYSC/CAC/NIN/BVN registrations, document processing and delivery across Nigeria.",
  icons: {
    icon: "/assets/logo-favicon.svg",
    shortcut: "/assets/logo-favicon.svg",
    apple: "/images/logo-app-icon.png",
  },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "DE-PRINCE DIGITAL HUB",
    title: "DE-PRINCE DIGITAL HUB | Everything Digital. One Platform.",
    description:
      "Everything Digital. One Platform. Printing, computer services, web development, graphic design, JAMB/NYSC/CAC/NIN/BVN registrations, document processing and delivery across Nigeria.",
  },
  twitter: {
    card: "summary_large_image",
    title: "DE-PRINCE DIGITAL HUB | Everything Digital. One Platform.",
    description:
      "Everything Digital. One Platform. Digital services across Nigeria.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0B0B",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${montserrat.variable} ${cinzel.variable} font-body bg-ink text-text`}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}