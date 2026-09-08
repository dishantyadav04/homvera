import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { Syne, Plus_Jakarta_Sans } from 'next/font/google'
import { Suspense } from 'react'
import { Toaster } from 'sonner'
import './globals.css'
import AppChrome from '@/components/layout/AppChrome'
import PageTransition from '@/components/ui/PageTransition'
import ClientLayoutExtras from '@/components/layout/ClientLayoutExtras'
import CookieConsentProvider from '@/components/consent/CookieConsentProvider'
import InstallPromptProvider from '@/components/pwa/InstallPromptProvider'
import PostHogProvider from '@/components/analytics/PostHogProvider'
import PostHogPageView from '@/components/analytics/PostHogPageView'
import { canonicalUrl } from '@/lib/seo'

const syne = Syne({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-display',
  display: 'swap',
  preload: true,
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
  preload: true,
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  interactiveWidget: 'resizes-content',
  themeColor: '#FF4500',
}

export const metadata: Metadata = {
  title: {
    default: 'Propcinity — Find the Right Property in Pune',
    template: '%s | Propcinity',
  },
  description: 'AI-curated real estate in Pune. Zero brokerage. Free for buyers. AI Match % scoring, RERA verification, and a dedicated channel partner.',
  keywords: ['real estate', 'Pune property', 'zero brokerage', 'buy flat Pune'],
  authors: [{ name: 'Propcinity' }],
  creator: 'Propcinity',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://propcinity.in'),
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Propcinity',
  },
  alternates: {
    canonical: canonicalUrl('/'),
  },
  openGraph: {
    siteName: 'Propcinity',
    title: 'Propcinity — Find the Right Property in Pune',
    description: 'AI-curated real estate in Pune. Zero brokerage. AI Match % scoring. Your dedicated channel partner in Pune.',
    type: 'website',
    locale: 'en_IN',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Propcinity — Find the Right Property in Pune',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Propcinity — Find the Right Property in Pune',
    images: ['/opengraph-image'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Propcinity",
    "url": "https://propcinity.in",
    "description": "Propcinity is a real estate channel partner platform that uses AI to curate property matches for buyers in Pune and negotiates with developers on the buyer's behalf, at no cost to buyers.",
    "areaServed": { "@type": "City", "name": "Pune" },
    "contactPoint": {
      "@type": "ContactPoint",
      "email": "hello@propcinity.in",
      "contactType": "customer service",
      "areaServed": "IN",
      "availableLanguage": ["English", "Hindi", "Marathi"]
    },
    "sameAs": [
      "https://www.instagram.com/propcinity",
      "https://www.linkedin.com/company/propcinity"
    ]
  }

  return (
    <html lang="en" className={`${syne.variable} ${jakarta.variable}`} suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <Script id="gtm-script" strategy="beforeInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-TGV9SXQR');`}
        </Script>
      </head>
      <body className="font-sans bg-[var(--background)] text-[var(--text-primary)] antialiased">
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-TGV9SXQR"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <CookieConsentProvider>
          <InstallPromptProvider>
          <PostHogProvider>
            <Suspense fallback={null}>
              <PostHogPageView />
            </Suspense>
            <AppChrome>
              <PageTransition>
                {children}
              </PageTransition>
            </AppChrome>
            <ClientLayoutExtras />
            <Toaster
              position="bottom-center"
              closeButton={true}
              duration={4000}
              toastOptions={{
                style: {
                  borderRadius: 'var(--radius)',
                  fontSize: '13px',
                  fontWeight: '600',
                  padding: '12px 16px',
                },
                classNames: {
                  closeButton: 'bg-transparent border-none text-current opacity-60 hover:opacity-100',
                },
              }}
            />
          </PostHogProvider>
          </InstallPromptProvider>
        </CookieConsentProvider>
      </body>
    </html>
  )
}
