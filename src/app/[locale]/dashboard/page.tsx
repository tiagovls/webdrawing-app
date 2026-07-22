import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import type { Annotation } from '@/lib/prisma'
import { formatFileSize, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { DeleteButton } from '@/components/DeleteButton'
import {
  Upload,
  Box,
  Share2,
  Clock,
  Eye,
  MoreHorizontal,
  FolderOpen,
} from 'lucide-react'

async function getProjects(userId: string) {
  return prisma.project.findMany({
    where: { userId },
    include: {
      shareLinks: {
        select: { id: true, viewCount: true, expiresAt: true, token: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export default async function DashboardPage() {
  const user = await currentUser()
  if (!user) return null

  // Ensure user exists in DB (upsert on first visit)
  await prisma.user.upsert({
    where: { id: user.id },
    update: {},
    create: {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress ?? '',
      name: user.firstName ?? null,
    },
  })

  const projects = await getProjects(user.id)
  const totalViews = projects.reduce(
    (acc: number, p: typeof projects[0]) => acc + p.shareLinks.reduce((a: number, l: typeof p.shareLinks[0]) => a + l.viewCount, 0),
    0,
  )

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-dark-900">
            Bonjour, {user.firstName ?? 'Concepteur'} 👋
          </h1>
          <p className="text-dark-700 text-sm mt-1">
            {projects.length} modèle{projects.length !== 1 ? 's' : ''} · {totalViews} vue{totalViews !== 1 ? 's' : ''} au total
          </p>
        </div>
        <Link
          href="/dashboard/upload"
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium px-5 py-2.5 rounded-xl transition-all shadow-sm text-sm"
        >
          <Upload className="w-4 h-4" />
          Nouveau modèle
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Modèles uploadés', value: projects.length, icon: Box },
          {
            label: 'Liens de partage',
            value: projects.reduce((a: number, p: typeof projects[0]) => a + p.shareLinks.length, 0),
            icon: Share2,
          },
          { label: 'Vues totales', value: totalViews, icon: Eye },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-surface-200 shadow-sm rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-dark-700 font-medium">{stat.label}</p>
              <stat.icon className="w-4 h-4 text-brand-500" />
            </div>
            <p className="text-3xl font-bold text-dark-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Projects list */}
      {projects.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-dark-700 mb-4">Modèles récents</h2>
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-white border border-surface-200 shadow-sm rounded-xl p-4 flex items-center gap-4 hover:border-brand-300 transition-all group"
            >
              {/* Icon */}
              <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                <Box className="w-5 h-5 text-brand-500" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-dark-900">{project.name}</p>
                <p className="text-xs text-dark-700 mt-0.5">
                  {formatFileSize(project.fileSize)} · {formatDate(project.createdAt)}
                </p>
              </div>

              {/* Share links count */}
              <div className="flex items-center gap-1.5 text-xs text-dark-700 shrink-0">
                <Share2 className="w-3.5 h-3.5" />
                {project.shareLinks.length} lien{project.shareLinks.length !== 1 ? 's' : ''}
              </div>

              {/* Views */}
              <div className="flex items-center gap-1.5 text-xs text-dark-700 shrink-0">
                <Eye className="w-3.5 h-3.5" />
                {project.shareLinks.reduce((a, l) => a + l.viewCount, 0)}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                <DeleteButton 
                  url={`/api/projects/${project.id}`} 
                  confirmMessage="Êtes-vous sûr de vouloir supprimer définitivement ce projet et tous ses liens de partage ?" 
                />
                <Link
                  href={`/dashboard/project/${project.id}`}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700 px-3 py-1.5 rounded-lg hover:bg-surface-50 border border-transparent hover:border-surface-200 transition-all"
                >
                  Gérer →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-24 bg-white border border-surface-200 shadow-sm rounded-2xl">
      <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-5">
        <FolderOpen className="w-8 h-8 text-brand-500" />
      </div>
      <h2 className="text-lg font-semibold mb-2 text-dark-900">Aucun modèle pour l'instant</h2>
      <p className="text-dark-700 text-sm mb-6 max-w-xs mx-auto">
        Uploadez votre premier fichier GLB pour commencer à partager vos modèles 3D.
      </p>
      <Link
        href="/dashboard/upload"
        className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium px-5 py-2.5 rounded-xl transition-all shadow-sm text-sm"
      >
        <Upload className="w-4 h-4" />
        Uploader un modèle
      </Link>
    </div>
  )
}
