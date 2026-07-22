import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://webdrawing.com'),
  title: {
    default: 'WebDrawing | Partage de modèles 3D CAO sans friction',
    template: '%s | WebDrawing',
  },
  description:
    "L'alternative moderne à eDrawings. Partagez, mesurez et annotez vos modèles 3D (SolidWorks, Fusion360, FreeCAD) directement dans le navigateur. Sans installation, sans compte.",
  keywords: [
    'Visionneuse 3D web', 
    'Collaboration CAO', 
    'Partage modèle 3D', 
    'eDrawings en ligne', 
    'ingénierie mécanique',
    'bureau d\'études',
    'freelance mécanique',
    'annotations 3D',
    'viewer GLTF'
  ],
  authors: [{ name: 'WebDrawing' }],
  creator: 'WebDrawing',
  publisher: 'WebDrawing',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: '/',
    siteName: 'WebDrawing',
    title: 'WebDrawing | Partage de modèles 3D CAO sans friction',
    description: "Partagez, mesurez et annotez vos modèles 3D (SolidWorks, Fusion360) directement dans le navigateur. L'alternative à eDrawings.",
    images: [
      {
        url: '/og-image.jpg', // Vous pourrez ajouter une image og-image.jpg dans le dossier public
        width: 1200,
        height: 630,
        alt: 'WebDrawing - Partage CAO 3D',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WebDrawing | Partage de modèles 3D CAO sans friction',
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
  return (
    <ClerkProvider>
      <html lang="fr" className={inter.variable}>
        <body className="antialiased bg-surface-50 text-dark-900 font-sans">
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
