import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // The 'token' param is actually the shareLink ID because we call /api/share/[id]
  const { token: shareId } = await params
  
  const shareLink = await prisma.shareLink.findUnique({
    where: { id: shareId },
    include: { project: true },
  })

  if (!shareLink) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (shareLink.project.userId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.shareLink.delete({ where: { id: shareId } })
  return NextResponse.json({ success: true })
}
