import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ shareLinkId: string }> },
) {
  try {
    const { shareLinkId } = await params
    const messages = await prisma.chatMessage.findMany({
      where: { shareLinkId },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(messages)
  } catch (err) {
    console.error('[CHAT_GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ shareLinkId: string }> },
) {
  try {
    const { shareLinkId } = await params
    const { text, author } = await req.json()

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    const message = await prisma.chatMessage.create({
      data: {
        shareLinkId,
        text: text.trim(),
        author: author?.trim() || 'Anonymous',
      },
    })

    return NextResponse.json(message, { status: 201 })
  } catch (err) {
    console.error('[CHAT_POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
