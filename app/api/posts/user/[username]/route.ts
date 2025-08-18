import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'posts' // posts, media, likes

    if (!username) {
      return NextResponse.json({ 
        error: 'Username is required' 
      }, { status: 400 })
    }

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { 
        username: username.toLowerCase() 
      },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 })
    }

    let posts: any[] = []

    if (type === 'posts') {
      // Get user's posts (original posts and replies)
      posts = await prisma.post.findMany({
        where: { 
          authorId: user.id 
        },
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
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
              reactions: true,
            },
          },
        },
      })
    } else if (type === 'media') {
      // Get posts with media attachments
      posts = await prisma.post.findMany({
        where: { 
          authorId: user.id,
          mediaAttachments: {
            isEmpty: false
          }
        },
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
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
          _count: {
            select: { 
              replies: true,
              reactions: true,
            },
          },
        },
      })
    } else if (type === 'likes') {
      // Get posts the user has liked
      const userReactions = await prisma.reaction.findMany({
        where: {
          userId: user.id,
          type: 'LIKE'
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
                  reactions: true,
                },
              },
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
      
      posts = userReactions.map(reaction => reaction.post)
    }

    return NextResponse.json({ 
      posts,
      type 
    })

  } catch (error) {
    console.error('Error fetching user posts:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch posts' 
    }, { status: 500 })
  }
}
