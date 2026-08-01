import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { Providers } from "./providers";
import { dirForLocale, isLocale, defaultLocale } from "@/i18n/config";

// Using Inter as primary font (more stable with Turbopack)
// IBM Plex Sans Arabic is loaded via CSS for Arabic text
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Jawab - AI Employee for MENA SMEs",
  description: "AI-powered receptionist that handles voice calls, WhatsApp, and Instagram DMs in multiple languages - 24/7.",
  keywords: ["AI", "chatbot", "WhatsApp", "voice AI", "MENA", "SME", "salon", "restaurant", "booking"],
  authors: [{ name: "Jawab Technologies" }],
  openGraph: {
    title: "Jawab - AI Employee for MENA SMEs",
    description: "AI-powered receptionist that handles voice calls, WhatsApp, and Instagram DMs in multiple languages - 24/7.",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerLocale = (await headers()).get('x-locale');
  const locale = isLocale(headerLocale || '') ? headerLocale! : defaultLocale;
  const dir = dirForLocale(locale as Parameters<typeof dirForLocale>[0]);

  return (
    <html lang={locale} dir={dir} data-scroll-behavior="smooth" className={`${inter.variable} ${locale === 'ar' ? 'font-ar' : 'font-en'}`}>
      <head>
        {/* Load IBM Plex Sans Arabic via Google Fonts CDN for Arabic support */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
