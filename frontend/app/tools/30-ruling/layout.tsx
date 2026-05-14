import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "30% Ruling Calculator Netherlands 2025 — Am I Eligible?",
  description: "Free 30% ruling eligibility calculator for 2025. Check if your Dutch employer, distance, timing and salary qualify. Instant result, no sign-up required.",
  keywords: [
    "30% ruling calculator",
    "30 percent ruling Netherlands",
    "30% ruling eligibility",
    "belastingvoordeel 30% regeling",
    "highly skilled migrant tax benefit Netherlands",
    "30% ruling salary threshold 2025",
    "kennismigrant belasting",
  ],
  alternates: { canonical: "https://valryn.nl/tools/30-ruling" },
  openGraph: {
    title: "30% Ruling Calculator Netherlands 2025",
    description: "Check your 30% ruling eligibility in 60 seconds. Free tool — no sign-up needed.",
    url: "https://valryn.nl/tools/30-ruling",
  },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "30% Ruling Eligibility Calculator",
  "url": "https://valryn.nl/tools/30-ruling",
  "description": "Free calculator to check eligibility for the Dutch 30% tax ruling in 2025. Covers employer type, distance from border, timing, and salary thresholds.",
  "applicationCategory": "FinanceApplication",
  "operatingSystem": "Web",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "EUR" },
  "provider": { "@type": "Organization", "name": "Valryn", "url": "https://valryn.nl" },
  "featureList": [
    "Dutch employer check",
    "150km distance rule check",
    "8-year timing rule check",
    "2025 salary threshold check",
    "Estimated net monthly benefit",
  ],
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {children}
    </>
  )
}
