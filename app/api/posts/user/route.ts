import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const posts = await prisma.post.findMany({
      where: { authorId: session.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { name: true, image: true },
        },
        reactions: true,
        _count: {
          select: { replies: true },
        },
        parent: {
          select: {
            id: true,
            content: true,
            authorId: true,
            author: {
              select: { name: true, image: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ posts })
  } catch (error) {
    console.error('Error fetching user posts:', error)
    return NextResponse.json({ error: 'Failed to fetch user posts' }, { status: 500 })
  }
}
