'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Box,
  Share2,
  Eye,
  Copy,
  Check,
  Trash2,
  Plus,
  ArrowLeft,
  Clock,
  Lock,
  Globe,
  ExternalLink,
  Calendar,
  HardDrive,
} from 'lucide-react'

/* ─── Types ─────────────────────────────────────────── */
interface ShareLink {
  id: string
  token: string
  url: string
  viewCount: number
  hasPassword: boolean
  passwordHash?: string | null
  expiresAt: string | null
  createdAt: string
}

interface Project {
  id: string
  name: string
  description: string | null
  fileSize: number
  fileName: string
  createdAt: string
  shareLinks: ShareLink[]
}

/* ─── Helpers ────────────────────────────────────────── */
function formatFileSize(bytes: number) {
  const b = Number(bytes) || 0
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(2)} MB`
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatDatetime(date: string) {
  return new Date(date).toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/* ─── Copy button ────────────────────────────────────── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-md hover:bg-surface-100 transition-colors text-dark-500 hover:text-dark-900"
      title="Copy link"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-brand-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

/* ─── Create share link modal ────────────────────────── */
function CreateLinkModal({
  projectId,
  onClose,
  onCreated,
}: {
  projectId: string
  onClose: () => void
  onCreated: (link: ShareLink) => void
}) {
  const [password, setPassword] = useState('')
  const [expiresIn, setExpiresIn] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const EXPIRES_OPTIONS = [
    { label: 'Never', value: '' },
    { label: '1 hour', value: '3600' },
    { label: '24 hours', value: '86400' },
    { label: '7 days', value: '604800' },
    { label: '30 days', value: '2592000' },
  ]

  const handleCreate = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          password: password || undefined,
          expiresIn: expiresIn ? parseInt(expiresIn) : undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const link = await res.json()
      onCreated(link)
      onClose()
    } catch {
      alert('Error creating link.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-bold text-dark-900 mb-5">New share link</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1.5">
              Password (optional)
            </label>
            <input
              type="password"
              placeholder="Leave empty for open access"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-surface-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 bg-surface-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1.5">
              Expiration
            </label>
            <select
              value={expiresIn}
              onChange={(e) => setExpiresIn(e.target.value)}
              className="w-full border border-surface-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 bg-surface-50"
            >
              {EXPIRES_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-surface-200 text-sm font-medium text-dark-700 hover:bg-surface-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            {isLoading ? 'Creating...' : 'Create link'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main page ──────────────────────────────────────── */
export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${id}`)
      if (!res.ok) {
        router.push('/dashboard')
        return
      }
      const data = await res.json()
      const appUrl = window.location.origin
      // Inject url into each shareLink
      data.shareLinks = (data.shareLinks ?? []).map((l: ShareLink) => ({
        ...l,
        url: `${appUrl}/view/${l.token}`,
        hasPassword: !!l.passwordHash,
      }))
      setProject(data)
    } finally {
      setIsLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    fetchProject()
  }, [fetchProject])

  const handleDeleteLink = async (linkId: string) => {
    if (!confirm('Delete this share link?')) return
    await fetch(`/api/share-links/${linkId}`, { method: 'DELETE' })
    setProject((prev) =>
      prev ? { ...prev, shareLinks: prev.shareLinks.filter((l) => l.id !== linkId) } : prev
    )
  }

  const handleLinkCreated = (link: ShareLink) => {
    setProject((prev) =>
      prev ? { ...prev, shareLinks: [link, ...prev.shareLinks] } : prev
    )
  }

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!project) return null

  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto w-full">
      {/* Back */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-dark-500 hover:text-dark-900 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to dashboard
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
          <Box className="w-6 h-6 text-brand-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-dark-900 truncate">{project.name}</h1>
          {project.description && (
            <p className="text-dark-500 text-sm mt-0.5">{project.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-dark-500">
            <span className="flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5" />
              {formatFileSize(project.fileSize)}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Uploaded on {formatDate(project.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        {[
          {
            label: 'Active links',
            value: project.shareLinks.length,
            icon: Share2,
          },
          {
            label: 'Total views',
            value: project.shareLinks.reduce((a, l) => a + (Number(l.viewCount) || 0), 0),
            icon: Eye,
          },
          {
            label: 'Password protected',
            value: project.shareLinks.filter((l) => l.hasPassword).length,
            icon: Lock,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white border border-surface-200 rounded-xl p-4 shadow-sm"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
              <p className="text-xs text-dark-500 font-medium">{stat.label}</p>
              <stat.icon className="w-4 h-4 text-brand-400" />
            </div>
            <p className="text-2xl font-bold text-dark-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Share links section */}
      <div className="bg-white border border-surface-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 py-4 border-b border-surface-100 gap-4">
          <h2 className="font-semibold text-dark-900 text-sm">Share links</h2>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New link
          </button>
        </div>

        {project.shareLinks.length === 0 ? (
          <div className="text-center py-14">
            <div className="w-12 h-12 rounded-xl bg-surface-100 flex items-center justify-center mx-auto mb-4">
              <Share2 className="w-6 h-6 text-dark-400" />
            </div>
            <p className="text-dark-700 font-medium mb-1">No share links</p>
            <p className="text-dark-400 text-sm">
              Create a link to share this model with your clients.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-surface-100">
            {project.shareLinks.map((link) => {
              const shareUrl = `${appUrl}/view/${link.token}`
              const isExpired = link.expiresAt && new Date(link.expiresAt) < new Date()
              return (
                <li key={link.id} className="px-4 md:px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4 group hover:bg-surface-50 transition-colors">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* Status icon */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isExpired ? 'bg-red-50' : 'bg-brand-50'}`}>
                      {link.hasPassword ? (
                        <Lock className={`w-4 h-4 ${isExpired ? 'text-red-400' : 'text-brand-500'}`} />
                      ) : (
                        <Globe className={`w-4 h-4 ${isExpired ? 'text-red-400' : 'text-brand-500'}`} />
                      )}
                    </div>

                    {/* Link info for mobile header */}
                    <div className="flex items-center gap-2 sm:hidden flex-1 min-w-0">
                      <p className="text-sm font-mono text-dark-700 truncate">{shareUrl}</p>
                      <CopyButton text={shareUrl} />
                    </div>
                  </div>

                  {/* Link info */}
                  <div className="flex-1 min-w-0 w-full sm:w-auto">
                    <div className="hidden sm:flex items-center gap-2">
                      <p className="text-sm font-mono text-dark-700 truncate">{shareUrl}</p>
                      <CopyButton text={shareUrl} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2 sm:mt-0.5 text-xs text-dark-400">
                      <span className="flex items-center gap-1 shrink-0">
                        <Eye className="w-3 h-3" />
                        {Number(link.viewCount) || 0} view{(Number(link.viewCount) || 0) !== 1 ? 's' : ''}
                      </span>
                      {link.hasPassword && (
                        <span className="flex items-center gap-1 shrink-0">
                          <Lock className="w-3 h-3" />
                          Protected
                        </span>
                      )}
                      {link.expiresAt && (
                        <span className={`flex items-center gap-1 shrink-0 ${isExpired ? 'text-red-400' : ''}`}>
                          <Clock className="w-3 h-3" />
                          {isExpired ? 'Expired' : `Expires ${formatDatetime(link.expiresAt)}`}
                        </span>
                      )}
                      <span className="shrink-0">Created {formatDate(link.createdAt)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end w-full sm:w-auto gap-2 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-surface-100">
                    <a
                      href={shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-1.5 sm:p-1.5 rounded-md hover:bg-surface-100 text-dark-400 hover:text-dark-900 transition-colors bg-surface-50 sm:bg-transparent"
                      title="Open"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="sm:hidden text-xs font-medium">Open</span>
                    </a>
                    <button
                      onClick={() => handleDeleteLink(link.id)}
                      className="flex items-center gap-2 px-3 py-1.5 sm:p-1.5 rounded-md hover:bg-red-50 text-dark-400 hover:text-red-500 transition-colors bg-surface-50 sm:bg-transparent"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="sm:hidden text-xs font-medium">Delete</span>
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <CreateLinkModal
          projectId={id}
          onClose={() => setShowModal(false)}
          onCreated={handleLinkCreated}
        />
      )}
    </div>
  )
}
