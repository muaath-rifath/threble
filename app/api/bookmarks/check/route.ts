import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'

// POST /api/bookmarks/check - Check bookmark status for multiple posts
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const { postIds } = await req.json()

    if (!Array.isArray(postIds)) {
      return NextResponse.json({ error: 'Post IDs must be an array' }, { status: 400 })
    }

    const bookmarks = await prisma.bookmark.findMany({
      where: {
        userId: session.user.id,
        postId: {
          in: postIds
        }
      },
      select: {
        postId: true
      }
    })

    const bookmarkedPostIds = bookmarks.map(bookmark => bookmark.postId)

    return NextResponse.json({ bookmarkedPostIds })
  } catch (error) {
    console.error('Error checking bookmark status:', error)
    return NextResponse.json(
      { error: 'Failed to check bookmark status' },
      { status: 500 }
    )
  }
}
