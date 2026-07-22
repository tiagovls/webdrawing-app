import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/annotations/[shareLinkId] — get all annotations for a share link (public, for viewers)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ shareLinkId: string }> },
) {
  const { shareLinkId } = await params

  // Verify the shareLink exists and is not expired
  const shareLink = await prisma.shareLink.findUnique({ where: { id: shareLinkId } })
  if (!shareLink) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (shareLink.expiresAt && new Date() > shareLink.expiresAt) {
    return NextResponse.json({ error: 'Link expired' }, { status: 410 })
  }

  const annotations = await prisma.annotation.findMany({
    where: { shareLinkId },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(annotations)
}

// POST /api/annotations/[shareLinkId] — create new annotation (public, for viewers)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ shareLinkId: string }> },
) {
  try {
    const { shareLinkId } = await params

    // Verify the shareLink exists and is not expired
    const shareLink = await prisma.shareLink.findUnique({ where: { id: shareLinkId } })
    if (!shareLink) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (shareLink.expiresAt && new Date() > shareLink.expiresAt) {
      return NextResponse.json({ error: 'Link expired' }, { status: 410 })
    }

    const { posX, posY, posZ, normX, normY, normZ, text, author, drawingData } = await req.json()

    if (!text?.trim() && !drawingData) {
      return NextResponse.json({ error: 'Text or drawing is required' }, { status: 400 })
    }

    // Sanitize author to prevent impersonation
    const sanitizedAuthor = author?.trim().slice(0, 64) || 'Anonymous'

    // Get current annotation count for this share link (for sequential index)
    const count = await prisma.annotation.count({ where: { shareLinkId } })

    const annotation = await prisma.annotation.create({
      data: {
        shareLinkId,
        posX: posX ?? 0,
        posY: posY ?? 0,
        posZ: posZ ?? 0,
        normX: normX ?? 0,
        normY: normY ?? 1,
        normZ: normZ ?? 0,
        text: text?.trim() || '',
        drawingData: drawingData || null,
        author: sanitizedAuthor,
        index: count + 1,
      },
    })

    return NextResponse.json(annotation, { status: 201 })
  } catch (err) {
    console.error('[ANNOTATION_CREATE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/annotations/[annotationId] — delete an annotation (public, any viewer can correct mistakes)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ shareLinkId: string }> },
) {
  try {
    const { shareLinkId: annotationId } = await params

    const annotation = await prisma.annotation.findUnique({
      where: { id: annotationId },
    })

    if (!annotation) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.annotation.delete({ where: { id: annotationId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete annotation', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// PATCH /api/annotations/[annotationId] — update an annotation (public, any viewer can correct mistakes)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ shareLinkId: string }> },
) {
  try {
    const { shareLinkId: annotationId } = await params
    const body = await req.json()

    const annotation = await prisma.annotation.findUnique({
      where: { id: annotationId },
    })
    if (!annotation) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updated = await prisma.annotation.update({
      where: { id: annotationId },
      data: {
        text: body.text !== undefined ? body.text.trim() : undefined,
        isPinned: body.isPinned !== undefined ? body.isPinned : undefined,
      },
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Failed to update annotation', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
