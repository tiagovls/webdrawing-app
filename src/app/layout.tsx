import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://www.webdrawing.fr'),
  title: {
    default: 'WebDrawing | Visualiseur 3D CAO & Collaboration de Plans en Ligne',
    template: '%s | WebDrawing',
  },
  description:
    "WebDrawing est la plateforme moderne pour partager, mesurer et annoter vos modèles 3D CAO (SolidWorks, STEP, IGES, STL) directement dans votre navigateur, sans aucun plugin.",
  keywords: [
    'WebDrawing',
    'webdrawing',
    'webdrawing.fr',
    'Visionneuse 3D web', 
    'Collaboration CAO', 
    'Partage modèle 3D', 
    'eDrawings en ligne', 
    'ingénierie mécanique',
    'bureau d\'études',
    'freelance mécanique',
    'annotations 3D',
    'viewer STEP GLTF'
  ],
  authors: [{ name: 'WebDrawing', url: 'https://www.webdrawing.fr' }],
  creator: 'WebDrawing',
  publisher: 'WebDrawing',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: 'https://www.webdrawing.fr',
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://www.webdrawing.fr',
    siteName: 'WebDrawing',
    title: 'WebDrawing | Visualiseur 3D CAO & Collaboration de Plans en Ligne',
    description: "Partagez, mesurez et annotez vos modèles 3D CAO (SolidWorks, STEP) directement dans le navigateur. Sans installation.",
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'WebDrawing - Visualiseur CAO 3D en Ligne',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WebDrawing | Visualiseur 3D CAO en Ligne',
    description: "Partagez, mesurez et annotez vos modèles 3D directement dans le navigateur. Sans installation.",
    creator: '@webdrawing',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'WebDrawing',
    operatingSystem: 'All',
    applicationCategory: 'DesignApplication',
    url: 'https://webdrawing.fr',
    description: 'Visualiseur 3D CAO et outil de collaboration en ligne pour fichiers SolidWorks, STEP, IGES, STL.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
    },
  }

  return (
    <ClerkProvider>
      <html lang="fr" className={inter.variable}>
        <head>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        </head>
        <body className="antialiased bg-surface-50 text-dark-900 font-sans">
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
