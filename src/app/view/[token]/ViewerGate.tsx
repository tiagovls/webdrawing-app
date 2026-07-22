
'use client'

import { useState, useEffect } from 'react'
import { Box, Lock, Eye, AlertCircle } from 'lucide-react'
import dynamic from 'next/dynamic'
import type { Annotation } from '@/lib/prisma'

const ViewerShell = dynamic(() => import('@/components/ViewerShell'), { ssr: false })

interface Props {
  token: string
  shareLinkId: string
  hasPassword: boolean
  projectName: string
  initialAnnotations: Annotation[]
  isOwner?: boolean
  creatorNote?: string | null
}

type GateState = 'loading' | 'password' | 'ready' | 'error'

export default function ViewerGate({
  token,
  shareLinkId,
  hasPassword,
  projectName,
  initialAnnotations,
  isOwner,
  creatorNote,
}: Props) {
  const [gateState, setGateState] = useState<GateState>(hasPassword ? 'password' : 'loading')
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [modelUrl, setModelUrl] = useState('')
  const [isChecking, setIsChecking] = useState(false)

  // Auto-fetch if no password
  useEffect(() => {
    if (!hasPassword) {
      fetchModelUrl()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchModelUrl = async (pwd?: string) => {
    setIsChecking(true)
    try {
      const res = await fetch(`/api/share/${token}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd ?? '' }),
      })
      const data = await res.json()

      if (res.status === 401 && data.requiresPassword) {
        setGateState('password')
        setPasswordError('Mot de passe incorrect')
        return
      }
      if (!res.ok) {
        setGateState('error')
        return
      }

      setModelUrl(data.viewUrl)
      setGateState('ready')
    } catch {
      setGateState('error')
    } finally {
      setIsChecking(false)
    }
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return
    setPasswordError('')
    fetchModelUrl(password)
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (gateState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 text-dark-900">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-brand-500/30 border-t-brand-500 animate-spin mx-auto mb-4" />
          <p className="text-sm text-dark-700">Ouverture du modèle...</p>
        </div>
      </div>
    )
  }

  // ── Password gate ──────────────────────────────────────────────────────────
  if (gateState === 'password') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface-50 px-4 text-dark-900">
        <div
          className="pointer-events-none fixed inset-0"
          style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(42, 75, 38, 0.08) 0%, transparent 70%)' }}
        />
        {/* Logo */}
        <div className="flex items-center gap-2 mb-12 relative z-10">
          <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center shadow-sm">
            <Box className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold">WebDrawing</span>
        </div>

        <div className="bg-white border border-surface-200 shadow-sm rounded-2xl p-8 w-full max-w-sm relative z-10">
          <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center mx-auto mb-5">
            <Lock className="w-6 h-6 text-brand-500" />
          </div>
          <h1 className="text-lg font-semibold text-center mb-1">{projectName}</h1>
          <p className="text-sm text-dark-700 text-center mb-6">
            Ce lien est protégé par un mot de passe
          </p>

          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              className="w-full px-4 py-3 rounded-xl border border-surface-200 bg-white text-dark-900 placeholder:text-dark-500 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 text-sm shadow-sm"
            />
            {passwordError && (
              <div className="flex items-center gap-2 text-red-600 text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {passwordError}
              </div>
            )}
            <button
              type="submit"
              disabled={!password.trim() || isChecking}
              className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white font-medium py-3 rounded-xl transition-all text-sm shadow-sm"
            >
              <Eye className="w-4 h-4" />
              {isChecking ? 'Vérification...' : 'Accéder au modèle'}
            </button>
          </form>
        </div>
        <p className="text-xs text-dark-500 mt-6 relative z-10">
          Shared via WebDrawing · No account required
        </p>
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (gateState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 text-dark-900">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-lg font-semibold mb-2">Impossible de charger le modèle</h1>
          <p className="text-dark-700 text-sm">
            Vérifiez votre lien ou contactez le concepteur.
          </p>
        </div>
      </div>
    )
  }

  // ── Ready: full screen viewer ──────────────────────────────────────────────
  return (
    <ViewerShell
      modelUrl={modelUrl}
      shareLinkId={shareLinkId}
      initialAnnotations={initialAnnotations}
      projectName={projectName}
      isOwner={isOwner}
      creatorNote={creatorNote}
    />
  )
}
