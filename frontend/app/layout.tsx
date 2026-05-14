import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://valryn.nl"),
  title: {
    default: "Valryn — Move smarter. Settle faster.",
    template: "%s | Valryn",
  },
  description: "AI-powered relocation platform for professionals moving to the Netherlands. Personalised checklist, IND document validation, 30% ruling calculator, deadline tracking — all in one place.",
  keywords: [
    "relocation Netherlands",
    "moving to Netherlands",
    "IND permit Netherlands",
    "highly skilled migrant Netherlands",
    "30% ruling calculator",
    "BSN registration Netherlands",
    "expat Netherlands checklist",
    "relocate Amsterdam",
    "kennismigrant Nederland",
    "DigiD registration",
  ],
  authors: [{ name: "Valryn", url: "https://valryn.nl" }],
  creator: "Valryn",
  publisher: "Bitquanta",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://valryn.nl",
    siteName: "Valryn",
    title: "Valryn — Move smarter. Settle faster.",
    description: "AI-powered relocation platform for professionals moving to the Netherlands. Personalised checklist, IND document validation, deadline tracking — all in one place.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Valryn — relocation platform for the Netherlands" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Valryn — Move smarter. Settle faster.",
    description: "AI-powered relocation platform for professionals moving to the Netherlands.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://valryn.nl",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
        <meta name="theme-color" content="#4f46e5" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Valryn" />
        {/* Apply theme before first paint to prevent flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()` }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
