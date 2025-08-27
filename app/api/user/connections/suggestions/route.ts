import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ 
        error: 'Unauthorized' 
      }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    // Get users who are not connected to current user
    // Exclude: self, existing connections, pending requests, rejected/blocked connections
    const existingConnectionIds = await prisma.connection.findMany({
      where: {
        OR: [
          { userId: session.user.id },
          { connectedUserId: session.user.id }
        ]
      },
      select: {
        userId: true,
        connectedUserId: true
      }
    })

    const excludeUserIds = new Set([session.user.id])
    existingConnectionIds.forEach(conn => {
      excludeUserIds.add(conn.userId)
      excludeUserIds.add(conn.connectedUserId)
    })

    // Get suggestions based on mutual connections and communities
    const suggestions = await prisma.user.findMany({
      where: {
        id: {
          notIn: Array.from(excludeUserIds)
        }
      },
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
        communities: {
          select: {
            community: {
              select: {
                id: true,
                name: true
              }
            }
          },
          take: 3
        }
      },
      take: limit,
      orderBy: {
        createdAt: 'desc'
      }
    })

    // For each suggestion, calculate mutual connections and communities
    const enrichedSuggestions = await Promise.all(
      suggestions.map(async (user) => {
        // Get mutual connections count
        const mutualConnectionsCount = await prisma.connection.count({
          where: {
            OR: [
              {
                userId: user.id,
                status: 'ACCEPTED',
                connectedUser: {
                  OR: [
                    {
                      connectedTo: {
                        some: {
                          userId: session.user.id,
                          status: 'ACCEPTED'
                        }
                      }
                    },
                    {
                      connections: {
                        some: {
                          connectedUserId: session.user.id,
                          status: 'ACCEPTED'
                        }
                      }
                    }
                  ]
                }
              },
              {
                connectedUserId: user.id,
                status: 'ACCEPTED',
                user: {
                  OR: [
                    {
                      connectedTo: {
                        some: {
                          userId: session.user.id,
                          status: 'ACCEPTED'
                        }
                      }
                    },
                    {
                      connections: {
                        some: {
                          connectedUserId: session.user.id,
                          status: 'ACCEPTED'
                        }
                      }
                    }
                  ]
                }
              }
            ]
          }
        })

        // Get current user's communities
        const currentUserCommunities = await prisma.communityMember.findMany({
          where: { userId: session.user.id },
          select: { communityId: true }
        })

        const currentUserCommunityIds = currentUserCommunities.map(cm => cm.communityId)

        // Find mutual communities
        const mutualCommunities = user.communities.filter(userComm => 
          currentUserCommunityIds.includes(userComm.community.id)
        )

        return {
          id: user.id,
          name: user.name,
          username: user.username,
          image: user.image,
          profile: user.profile,
          mutualConnectionsCount,
          mutualCommunities: mutualCommunities.map(mc => mc.community),
          suggestedBecause: mutualConnectionsCount > 0 
            ? 'mutual_connections' 
            : mutualCommunities.length > 0 
            ? 'mutual_communities' 
            : 'new_member'
        }
      })
    )

    // Sort by relevance (mutual connections first, then mutual communities)
    const sortedSuggestions = enrichedSuggestions.sort((a, b) => {
      if (a.mutualConnectionsCount !== b.mutualConnectionsCount) {
        return b.mutualConnectionsCount - a.mutualConnectionsCount
      }
      return b.mutualCommunities.length - a.mutualCommunities.length
    })

    return NextResponse.json({
      suggestions: sortedSuggestions
    })

  } catch (error) {
    console.error('Error fetching connection suggestions:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
