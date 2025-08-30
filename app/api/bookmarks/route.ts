import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'

// GET /api/bookmarks - Fetch user's bookmarks with pagination
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '10')
  const cursor = searchParams.get('cursor')

  try {
    // Build where clause
    let whereClause: any = {
      userId: session.user.id
    }

    // Add cursor condition if provided
    if (cursor) {
      whereClause.createdAt = { lt: new Date(cursor) }
    }

    const bookmarks = await prisma.bookmark.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      include: {
        post: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true,
              },
            },
            community: {
              select: {
                id: true,
                name: true,
                image: true,
              }
            },
            reactions: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                  }
                }
              }
            },
            parent: {
              include: {
                author: {
                  select: { 
                    id: true,
                    name: true,
                    username: true,
                    image: true 
                  },
                },
              },
            },
            _count: {
              select: { 
                replies: true,
                reactions: true
              },
            },
          }
        }
      }
    })

    // Check if there are more results
    const hasMore = bookmarks.length > limit
    const data = hasMore ? bookmarks.slice(0, -1) : bookmarks
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].createdAt.toISOString() : null

    // Transform the data
    const transformedBookmarks = data.map(bookmark => ({
      ...bookmark,
      createdAt: bookmark.createdAt.toISOString(),
      post: {
        ...bookmark.post,
        createdAt: bookmark.post.createdAt.toISOString(),
        updatedAt: bookmark.post.updatedAt.toISOString(),
        reactions: bookmark.post.reactions.map(r => ({
          ...r,
          createdAt: r.createdAt.toISOString()
        }))
      }
    }))

    return NextResponse.json({ 
      bookmarks: transformedBookmarks,
      nextCursor,
      hasMore
    })
  } catch (error) {
    console.error('Error fetching bookmarks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bookmarks' },
      { status: 500 }
    )
  }
}

// POST /api/bookmarks - Add a bookmark
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (!session.user?.id) {
    return NextResponse.json({ error: 'User ID not found in session' }, { status: 400 })
  }

  try {
    const { postId } = await req.json()

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 })
    }

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
        community: {
          select: {
            id: true,
            name: true,
            image: true,
          }
        },
        reactions: true,
        _count: {
          select: { 
            replies: true,
            reactions: true
          },
        },
      }
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Check if already bookmarked
    const existingBookmark = await prisma.bookmark.findUnique({
      where: {
        userId_postId: {
          userId: session.user.id,
          postId
        }
      }
    })

    if (existingBookmark) {
      return NextResponse.json({ error: 'Post already bookmarked' }, { status: 409 })
    }

    // Create bookmark
    const bookmark = await prisma.bookmark.create({
      data: {
        userId: session.user.id,
        postId
      },
      include: {
        post: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true,
              },
            },
            community: {
              select: {
                id: true,
                name: true,
                image: true,
              }
            },
            reactions: true,
            _count: {
              select: { 
                replies: true,
                reactions: true
              },
            },
          }
        }
      }
    })

    // Transform the data
    const transformedBookmark = {
      ...bookmark,
      createdAt: bookmark.createdAt.toISOString(),
      post: {
        ...bookmark.post,
        createdAt: bookmark.post.createdAt.toISOString(),
        updatedAt: bookmark.post.updatedAt.toISOString(),
        reactions: bookmark.post.reactions.map(r => ({
          ...r,
          createdAt: r.createdAt.toISOString()
        }))
      }
    }

    return NextResponse.json(transformedBookmark, { status: 201 })
  } catch (error) {
    console.error('Error adding bookmark:', error)
    return NextResponse.json(
      { error: 'Failed to add bookmark' },
      { status: 500 }
    )
  }
}

// DELETE /api/bookmarks - Remove a bookmark
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const { postId } = await req.json()

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 })
    }

    // Find and delete bookmark
    const bookmark = await prisma.bookmark.findUnique({
      where: {
        userId_postId: {
          userId: session.user.id,
          postId
        }
      }
    })

    if (!bookmark) {
      return NextResponse.json({ error: 'Bookmark not found' }, { status: 404 })
    }

    await prisma.bookmark.delete({
      where: {
        id: bookmark.id
      }
    })

    return NextResponse.json({ success: true, postId })
  } catch (error) {
    console.error('Error removing bookmark:', error)
    return NextResponse.json(
      { error: 'Failed to remove bookmark' },
      { status: 500 }
    )
  }
}
