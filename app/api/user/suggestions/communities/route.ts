import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '5')

    const userId = session.user.id

    // Get user's current communities to exclude
    const userCommunities = await prisma.communityMember.findMany({
      where: { userId },
      select: { communityId: true }
    })
    const excludeIds = userCommunities.map(uc => uc.communityId)

    // Get user's connections and following
    const connections = await prisma.connection.findMany({
      where: {
        OR: [
          { userId: userId, status: 'ACCEPTED' },
          { connectedUserId: userId, status: 'ACCEPTED' }
        ]
      },
      select: {
        userId: true,
        connectedUserId: true
      }
    })

    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true }
    })

    // Extract connected and followed user IDs
    const connectedUserIds = new Set<string>()
    connections.forEach(conn => {
      if (conn.userId === userId) {
        connectedUserIds.add(conn.connectedUserId)
      } else {
        connectedUserIds.add(conn.userId)
      }
    })

    const followedUserIds = following.map(f => f.followingId)
    const relevantUserIds = [...Array.from(connectedUserIds), ...followedUserIds]

    // Find communities where connections/following are members
    const suggestedCommunities = await prisma.community.findMany({
      where: {
        visibility: 'PUBLIC',
        id: { notIn: excludeIds },
        members: {
          some: {
            userId: { in: relevantUserIds }
          }
        }
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true
          }
        },
        members: {
          where: {
            userId: { in: relevantUserIds }
          },
          take: 3,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true
              }
            }
          }
        },
        _count: {
          select: {
            members: true,
            posts: true
          }
        }
      },
      orderBy: [
        { members: { _count: 'desc' } },
        { posts: { _count: 'desc' } }
      ],
      take: limit
    })

    // Format response with reason for suggestion
    const formattedSuggestions = suggestedCommunities.map(community => {
      const connectionsInCommunity = community.members.filter(member => 
        connectedUserIds.has(member.userId)
      )
      const followingInCommunity = community.members.filter(member => 
        followedUserIds.includes(member.userId)
      )

      let reasonType = ''
      let reasonUsers: Array<{ id: string; name: string | null; username: string | null; image: string | null }> = []

      if (connectionsInCommunity.length > 0) {
        reasonType = 'connections'
        reasonUsers = connectionsInCommunity.map(member => member.user)
      } else if (followingInCommunity.length > 0) {
        reasonType = 'following'
        reasonUsers = followingInCommunity.map(member => member.user)
      }

      return {
        id: community.id,
        name: community.name,
        description: community.description,
        image: community.image,
        coverImage: community.coverImage,
        creator: community.creator,
        _count: community._count,
        suggestion: {
          reason: reasonType,
          users: reasonUsers.slice(0, 3), // Show up to 3 users
          totalCount: reasonType === 'connections' ? connectionsInCommunity.length : followingInCommunity.length
        }
      }
    })

    // If no suggestions from connections/following, suggest popular communities
    let fallbackCommunities: any[] = []
    if (suggestedCommunities.length < limit) {
      fallbackCommunities = await prisma.community.findMany({
        where: {
          visibility: 'PUBLIC',
          id: { 
            notIn: [
              ...excludeIds, 
              ...suggestedCommunities.map(c => c.id)
            ] 
          }
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true
            }
          },
          _count: {
            select: {
              members: true,
              posts: true
            }
          }
        },
        orderBy: [
          { members: { _count: 'desc' } },
          { posts: { _count: 'desc' } },
          { createdAt: 'desc' }
        ],
        take: limit - suggestedCommunities.length
      })
    }

    // Format fallback communities
    const formattedFallbackCommunities = fallbackCommunities.map(community => ({
      id: community.id,
      name: community.name,
      description: community.description,
      image: community.image,
      coverImage: community.coverImage,
      creator: community.creator,
      _count: community._count,
      suggestion: {
        reason: 'popular',
        users: [],
        totalCount: 0
      }
    }))

    const allSuggestions = [...formattedSuggestions, ...formattedFallbackCommunities]

    return NextResponse.json({
      communities: allSuggestions,
      hasMoreSuggestions: relevantUserIds.length === 0 ? allSuggestions.length > 0 : true,
      message: relevantUserIds.length === 0 && allSuggestions.length === 0 
        ? 'Expand your connections and follows for better suggestions!' 
        : relevantUserIds.length === 0 
        ? 'Connect with others to get personalized community suggestions!'
        : null
    })

  } catch (error) {
    console.error('Error fetching community suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch community suggestions' },
      { status: 500 }
    )
  }
}
