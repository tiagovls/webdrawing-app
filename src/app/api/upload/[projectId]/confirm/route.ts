import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { projectId } = await params

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (project.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Mark as READY (already set on creation, this just confirms)
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'READY' },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[UPLOAD_CONFIRM]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
