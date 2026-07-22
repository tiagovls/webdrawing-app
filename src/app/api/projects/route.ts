import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getViewPresignedUrl } from '@/lib/r2'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'

// GET /api/projects — list user's projects
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projects = await prisma.project.findMany({
    where: { userId },
    include: { shareLinks: { select: { id: true, token: true, expiresAt: true, viewCount: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(projects)
}
