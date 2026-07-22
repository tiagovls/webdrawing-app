import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUploadPresignedUrl } from '@/lib/r2'
import { nanoid } from 'nanoid'

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { name, fileName, fileSize, contentType } = await req.json()
    if (!name || !fileName || !fileSize) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Validate fileSize is a positive number within limits (500 MB max)
    const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500 MB
    if (typeof fileSize !== 'number' || fileSize <= 0 || fileSize > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Invalid file size. Maximum 500 MB allowed.' }, { status: 400 })
    }

    // Validate file type
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (ext !== 'glb' && ext !== 'gltf') {
      return NextResponse.json({ error: 'Invalid file type. Only GLB/GLTF allowed.' }, { status: 400 })
    }

    // Validate filename length to prevent overly long paths
    if (fileName.length > 255) {
      return NextResponse.json({ error: 'File name too long.' }, { status: 400 })
    }

    // Generate a unique storage key
    const fileKey = `models/${userId}/${nanoid()}/${fileName}`

    // Create project record in DB
    const project = await prisma.project.create({
      data: {
        userId,
        name,
        fileName,
        fileKey,
        fileSize,
        status: 'READY',
      },
    })

    // Generate presigned upload URL (valid for 1 hour)
    const uploadUrl = await getUploadPresignedUrl(
      fileKey,
      contentType || 'model/gltf-binary',
      3600,
    )

    return NextResponse.json({ uploadUrl, projectId: project.id })
  } catch (err) {
    console.error('[UPLOAD_INIT]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
