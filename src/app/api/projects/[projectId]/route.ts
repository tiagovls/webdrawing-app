import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getViewPresignedUrl, deleteFile } from '@/lib/r2'

// GET /api/projects/[projectId] — project detail + signed view URL
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId } = await params
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { shareLinks: true },
  })

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (project.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const publicDomain = process.env.R2_PUBLIC_DOMAIN
  const viewUrl = publicDomain
    ? `${publicDomain}/${project.fileKey}`
    : await getViewPresignedUrl(project.fileKey, 3600)
  return NextResponse.json({ ...project, viewUrl })
}

// DELETE /api/projects/[projectId] — delete project + file
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId } = await params
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (project.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await deleteFile(project.fileKey).catch(e => console.error('Failed to delete R2 file', e))
  await prisma.project.delete({ where: { id: projectId } })
  return NextResponse.json({ success: true })
}
