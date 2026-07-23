import { SignIn } from '@clerk/nextjs'
import { Box } from 'lucide-react'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Se connecter',
  description: 'Connectez-vous à votre espace WebDrawing',
}

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative">
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-surface-50"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(42, 75, 38, 0.08) 0%, var(--color-surface-50) 70%)',
        }}
      />
      <Link href="/" className="relative z-10 flex items-center gap-2 mb-8">
        <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center shadow-sm">
          <Box className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-lg text-dark-900">WebDrawing</span>
      </Link>
      <div className="relative z-10">
        <SignIn appearance={{ variables: { colorPrimary: '#2A4B26' } }} />
      </div>
    </div>
  )
}
