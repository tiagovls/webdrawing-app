import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ClientUserButton } from '@/components/ClientUserButton'
import { Box, LayoutGrid, Upload, Settings } from 'lucide-react'
import type { Metadata } from 'next'
import { getUserPlan } from '@/app/actions'
import { PlanBadge } from '@/components/blocks/plan-badge'
import { MobileDashboardNav } from '@/components/MobileDashboardNav'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Gérez vos modèles 3D partagés',
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await currentUser()
  if (!user) redirect('/sign-in')

  const { isPro } = await getUserPlan(user.id)
  if (!isPro) redirect('/#pricing')

  return (
    <div className="flex flex-col md:flex-row min-h-screen relative">
      <MobileDashboardNav 
        userFirstName={user.firstName ?? user.emailAddresses[0]?.emailAddress ?? ''}
        userEmail={user.emailAddresses[0]?.emailAddress ?? ''}
      />
      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <aside
        className="w-60 shrink-0 hidden md:flex flex-col border-r border-surface-200 py-6 bg-white"
      >
        {/* Brand */}
        <div className="px-5 mb-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
              <Box className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-base text-dark-900">WebDrawing</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1">
          <NavItem href="/dashboard" icon={LayoutGrid} label="Mes projets" />
          <NavItem href="/dashboard/upload" icon={Upload} label="Nouvel upload" />
        </nav>

        {/* User */}
        <div className="px-5 pt-4 border-t border-surface-200">
          <div className="flex items-center gap-3">
            <ClientUserButton />
            <PlanBadge />
          </div>
          <div className="min-w-0 mt-3">
              <p className="text-sm font-medium truncate text-dark-900">
                {user.firstName ?? user.emailAddresses[0]?.emailAddress}
              </p>
              <p className="text-xs text-dark-700 truncate">
                {user.emailAddresses[0]?.emailAddress}
              </p>
            </div>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto bg-surface-50 text-dark-900">
        {children}
      </main>
    </div>
  )
}

function NavItem({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: React.ElementType
  label: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-dark-700 hover:text-brand-600 hover:bg-surface-50 transition-all group"
    >
      <Icon className="w-4 h-4 shrink-0 group-hover:text-brand-500 transition-colors" />
      {label}
    </Link>
  )
}
