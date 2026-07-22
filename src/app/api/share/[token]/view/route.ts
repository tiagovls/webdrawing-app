import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getViewPresignedUrl } from '@/lib/r2'
import bcrypt from 'bcryptjs'

// POST /api/share/[token]/view — validate access and return signed URL
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params
    const body = await req.json().catch(() => ({}))
    const { password } = body

    const shareLink = await prisma.shareLink.findUnique({
      where: { token },
      include: { project: true },
    })

    if (!shareLink) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    // Check expiration
    if (shareLink.expiresAt && new Date() > shareLink.expiresAt) {
      return NextResponse.json({ error: 'Link expired' }, { status: 410 })
    }

    // Check password
    if (shareLink.passwordHash) {
      if (!password) {
        return NextResponse.json({ error: 'Password required', requiresPassword: true }, { status: 401 })
      }
      const valid = await bcrypt.compare(password, shareLink.passwordHash)
      if (!valid) {
        return NextResponse.json({ error: 'Invalid password', requiresPassword: true }, { status: 401 })
      }
    }

    // Increment view count
    await prisma.shareLink.update({
      where: { id: shareLink.id },
      data: { viewCount: { increment: 1 } },
    })

    // Return model URL — prefer public domain (faster), fallback to presigned URL
    const publicDomain = process.env.R2_PUBLIC_DOMAIN
    const viewUrl = publicDomain
      ? `${publicDomain}/${shareLink.project.fileKey}`
      : await getViewPresignedUrl(shareLink.project.fileKey, 7200)

    return NextResponse.json({
      viewUrl,
      projectName: shareLink.project.name,
      shareLinkId: shareLink.id,
    })
  } catch (err) {
    console.error('[SHARE_VIEW]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
