import { prisma } from '@/lib/prisma'
import { isExpired } from '@/lib/utils'
import { notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import ViewerGate from './ViewerGate'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const link = await prisma.shareLink.findUnique({
    where: { token },
    include: { project: { select: { name: true } } },
  })
  return {
    title: link?.project?.name ?? 'Modèle 3D partagé',
    description: 'Visualisez ce modèle 3D interactif dans votre navigateur',
  }
}

export default async function ViewPage({ params }: Props) {
  const { token } = await params

  const { userId } = await auth()

  const shareLink = await prisma.shareLink.findUnique({
    where: { token },
    include: {
      project: { select: { userId: true, name: true, fileKey: true } },
      annotations: { orderBy: [{ isPinned: 'desc' }, { createdAt: 'asc' }] },
    },
  })

  if (!shareLink) notFound()

  if (isExpired(shareLink.expiresAt)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 text-dark-900">
        <div className="text-center">
          <div className="text-5xl mb-4">⏰</div>
          <h1 className="text-xl font-semibold mb-2">Ce lien a expiré</h1>
          <p className="text-dark-700 text-sm">
            Demandez un nouveau lien au concepteur.
          </p>
        </div>
      </div>
    )
  }

  const isOwner = shareLink.project.userId === userId

  return (
    <ViewerGate
      token={token}
      shareLinkId={shareLink.id}
      hasPassword={!!shareLink.passwordHash}
      projectName={shareLink.project.name}
      initialAnnotations={shareLink.annotations}
      isOwner={isOwner}
      creatorNote={shareLink.creatorNote}
    />
  )
}
