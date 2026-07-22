'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, Box, LayoutGrid, Upload } from 'lucide-react'
import { ClientUserButton } from '@/components/ClientUserButton'
import { PlanBadge } from '@/components/blocks/plan-badge'

export function MobileDashboardNav({
  userFirstName,
  userEmail,
}: {
  userFirstName: string
  userEmail: string
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-surface-200 z-50">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
            <Box className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-base text-dark-900">WebDrawing</span>
        </Link>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-dark-700 hover:text-dark-900 transition-colors"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {isOpen && (
        <div className="md:hidden absolute top-[65px] left-0 right-0 bg-white shadow-xl z-40 flex flex-col p-4 border-b border-surface-200">
          <nav className="flex flex-col space-y-1 mb-6">
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 p-3 rounded-xl text-dark-700 hover:bg-surface-50 font-medium"
            >
              <LayoutGrid className="w-5 h-5 text-dark-500" />
              My projects
            </Link>
            <Link
              href="/dashboard/upload"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 p-3 rounded-xl text-dark-700 hover:bg-surface-50 font-medium"
            >
              <Upload className="w-5 h-5 text-dark-500" />
              New upload
            </Link>
          </nav>
          <div className="border-t border-surface-100 pt-5">
            <div className="flex items-center gap-4 mb-4">
              <ClientUserButton />
              <PlanBadge />
            </div>
            <p className="text-sm font-medium text-dark-900 truncate">
              {userFirstName}
            </p>
            <p className="text-xs text-dark-500 truncate">{userEmail}</p>
          </div>
        </div>
      )}
    </>
  )
}
