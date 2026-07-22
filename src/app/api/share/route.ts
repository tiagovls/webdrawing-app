import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'

// POST /api/share — create a new share link
export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { projectId, password, expiresIn } = await req.json()
    if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })

    // Verify project ownership
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (project.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Hash password if provided
    let passwordHash: string | null = null
    if (password && password.trim()) {
      passwordHash = await bcrypt.hash(password.trim(), 10)
    }

    // Calculate expiration date
    let expiresAt: Date | null = null
    if (expiresIn) {
      expiresAt = new Date(Date.now() + expiresIn * 1000)
    }

    const shareLink = await prisma.shareLink.create({
      data: {
        token: nanoid(16),
        projectId,
        passwordHash,
        expiresAt,
      },
    })

    const host = req.headers.get('host') || 'localhost:3000'
    const protocol = host.startsWith('localhost') || host.match(/^\d+\.\d+\.\d+\.\d+/) ? 'http' : 'https'
    const appUrl = `${protocol}://${host}`
    return NextResponse.json({
      id: shareLink.id,
      token: shareLink.token,
      url: `${appUrl}/view/${shareLink.token}`,
      hasPassword: !!passwordHash,
      expiresAt: shareLink.expiresAt,
    })
  } catch (err) {
    console.error('[SHARE_CREATE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
