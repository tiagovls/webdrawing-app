import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'

// PATCH /api/share-links/[id] — update share link creator note
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    
    // Check if it exists and owner is current user
    const shareLink = await prisma.shareLink.findUnique({
      where: { id },
      include: { project: true }
    })
    
    if (!shareLink) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (shareLink.project.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await prisma.shareLink.update({
      where: { id },
      data: {
        creatorNote: body.creatorNote !== undefined ? body.creatorNote : undefined,
      },
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Failed to update share link', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// DELETE /api/share-links/[id] — delete a share link
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const shareLink = await prisma.shareLink.findUnique({
      where: { id },
      include: { project: true },
    })

    if (!shareLink) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (shareLink.project.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.shareLink.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete share link', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
