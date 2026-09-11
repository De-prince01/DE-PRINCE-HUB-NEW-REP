import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/toaster";
import { SITE_URL } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "De-Prince Digital Hub | Everything Digital. One Platform.",
    template: "%s | De-Prince Digital Hub",
  },
  description: "Everything Digital. One Platform.",
  icons: {
    icon: "/assets/logo-favicon.svg",
    shortcut: "/assets/logo-favicon.svg",
    apple: "/images/logo-app-icon.png",
  },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "De-Prince Digital Hub",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
