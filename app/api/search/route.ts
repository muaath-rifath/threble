import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q') || ''
    const type = searchParams.get('type') || 'all' // all, posts, users, communities
    const cursor = searchParams.get('cursor')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!query.trim()) {
      return NextResponse.json({
        results: [],
        nextCursor: null,
        hasMore: false,
        type
      })
    }

    let results: any[] = []
    let nextCursor: string | null = null
    let hasMore = false

    const searchTerm = query.trim()

    if (type === 'all' || type === 'posts') {
      // Search posts
      const whereClause: any = {
        OR: [
          { content: { contains: searchTerm, mode: 'insensitive' } }
        ]
      }

      if (cursor && type === 'posts') {
        whereClause.id = { lt: cursor }
      }

      const posts = await prisma.post.findMany({
        where: whereClause,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            }
          },
          reactions: {
            select: {
              type: true,
              userId: true
            }
          },
          _count: {
            select: { replies: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: type === 'posts' ? limit + 1 : Math.ceil(limit / 3)
      })

      if (type === 'posts') {
        hasMore = posts.length > limit
        const data = hasMore ? posts.slice(0, -1) : posts
        nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null
        
        results = data.map(post => ({
          id: post.id,
          type: 'post',
          content: post.content,
          author: post.author,
          createdAt: post.createdAt.toISOString(),
          reactions: post.reactions,
          replyCount: post._count.replies
        }))
      } else {
        results.push(...posts.map(post => ({
          id: post.id,
          type: 'post',
          content: post.content,
          author: post.author,
          createdAt: post.createdAt.toISOString(),
          reactions: post.reactions,
          replyCount: post._count.replies
        })))
      }
    }

    if (type === 'all' || type === 'users') {
      // Search users
      const whereClause: any = {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { username: { contains: searchTerm, mode: 'insensitive' } }
        ]
      }

      if (cursor && type === 'users') {
        whereClause.id = { lt: cursor }
      }

      const users = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          profile: {
            select: {
              bio: true,
              location: true
            }
          },
          _count: {
            select: {
              posts: true,
              connections: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: type === 'users' ? limit + 1 : Math.ceil(limit / 3)
      })

      if (type === 'users') {
        hasMore = users.length > limit
        const data = hasMore ? users.slice(0, -1) : users
        nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null
        
        results = data.map(user => ({
          id: user.id,
          type: 'user',
          name: user.name,
          username: user.username,
          image: user.image,
          profile: user.profile,
          userPostCount: user._count.posts,
          connectionCount: user._count.connections
        }))
      } else {
        results.push(...users.map(user => ({
          id: user.id,
          type: 'user',
          name: user.name,
          username: user.username,
          image: user.image,
          profile: user.profile,
          userPostCount: user._count.posts,
          connectionCount: user._count.connections
        })))
      }
    }

    if (type === 'all' || type === 'communities') {
      // Search communities
      const whereClause: any = {
        visibility: 'PUBLIC',
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } }
        ]
      }

      if (cursor && type === 'communities') {
        whereClause.id = { lt: cursor }
      }

      const communities = await prisma.community.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          description: true,
          image: true,
          visibility: true,
          _count: {
            select: {
              members: true,
              posts: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: type === 'communities' ? limit + 1 : Math.ceil(limit / 3)
      })

      if (type === 'communities') {
        hasMore = communities.length > limit
        const data = hasMore ? communities.slice(0, -1) : communities
        nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null
        
        results = data.map(community => ({
          id: community.id,
          type: 'community',
          name: community.name,
          description: community.description,
          image: community.image,
          visibility: community.visibility,
          memberCount: community._count.members,
          communityPostCount: community._count.posts
        }))
      } else {
        results.push(...communities.map(community => ({
          id: community.id,
          type: 'community',
          name: community.name,
          description: community.description,
          image: community.image,
          visibility: community.visibility,
          memberCount: community._count.members,
          communityPostCount: community._count.posts
        })))
      }
    }

    // For 'all' type, we don't use cursor pagination, just return mixed results
    if (type === 'all') {
      // Sort mixed results by relevance/recency
      results.sort((a, b) => {
        const aDate = new Date(a.createdAt || 0)
        const bDate = new Date(b.createdAt || 0)
        return bDate.getTime() - aDate.getTime()
      })
      
      // Limit results for 'all' type
      results = results.slice(0, limit)
      hasMore = false // Don't use pagination for mixed results
      nextCursor = null
    }

    return NextResponse.json({
      results,
      nextCursor,
      hasMore,
      type,
      query: searchTerm
    })

  } catch (error) {
    console.error('Error in global search:', error)
    return NextResponse.json(
      { error: 'Failed to perform search' },
      { status: 500 }
    )
  }
}
