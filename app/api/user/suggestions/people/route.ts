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

    // Get existing connections and pending requests to exclude
    const existingConnections = await prisma.connection.findMany({
      where: {
        OR: [
          { userId: userId },
          { connectedUserId: userId }
        ]
      },
      select: {
        userId: true,
        connectedUserId: true
      }
    })

    const excludeUserIds = new Set([userId])
    existingConnections.forEach(conn => {
      excludeUserIds.add(conn.userId)
      excludeUserIds.add(conn.connectedUserId)
    })

    // Get user's current connections for finding mutual connections
    const userConnections = await prisma.connection.findMany({
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

    const connectedUserIds = new Set<string>()
    userConnections.forEach(conn => {
      if (conn.userId === userId) {
        connectedUserIds.add(conn.connectedUserId)
      } else {
        connectedUserIds.add(conn.userId)
      }
    })

    // Find connections of connections (2nd degree connections)
    const secondDegreeConnections = await prisma.connection.findMany({
      where: {
        OR: [
          {
            userId: { in: Array.from(connectedUserIds) },
            status: 'ACCEPTED',
            connectedUserId: { notIn: Array.from(excludeUserIds) }
          },
          {
            connectedUserId: { in: Array.from(connectedUserIds) },
            status: 'ACCEPTED',
            userId: { notIn: Array.from(excludeUserIds) }
          }
        ]
      },
      select: {
        userId: true,
        connectedUserId: true,
        user: {
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
            }
          }
        },
        connectedUser: {
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
            }
          }
        }
      },
      take: limit * 2 // Get more to account for duplicates
    })

    // Process suggestions and count mutual connections
    const suggestionMap = new Map<string, {
      user: any;
      mutualConnections: Array<{ id: string; name: string | null; username: string | null; image: string | null }>;
      mutualConnectionCount: number;
    }>()

    for (const connection of secondDegreeConnections) {
      const suggestedUser = connectedUserIds.has(connection.userId) 
        ? connection.connectedUser 
        : connection.user
      const mutualConnectionId = connectedUserIds.has(connection.userId) 
        ? connection.userId 
        : connection.connectedUserId

      if (!suggestionMap.has(suggestedUser.id)) {
        // Get the mutual connection user details
        const mutualConnectionUser = await prisma.user.findUnique({
          where: { id: mutualConnectionId },
          select: {
            id: true,
            name: true,
            username: true,
            image: true
          }
        })

        suggestionMap.set(suggestedUser.id, {
          user: suggestedUser,
          mutualConnections: mutualConnectionUser ? [mutualConnectionUser] : [],
          mutualConnectionCount: 1
        })
      } else {
        const existing = suggestionMap.get(suggestedUser.id)!
        
        // Get the mutual connection user details
        const mutualConnectionUser = await prisma.user.findUnique({
          where: { id: mutualConnectionId },
          select: {
            id: true,
            name: true,
            username: true,
            image: true
          }
        })

        if (mutualConnectionUser && !existing.mutualConnections.some(mc => mc.id === mutualConnectionUser.id)) {
          existing.mutualConnections.push(mutualConnectionUser)
          existing.mutualConnectionCount++
        }
      }
    }

    // Convert to array and sort by mutual connection count
    let suggestions = Array.from(suggestionMap.values())
      .sort((a, b) => b.mutualConnectionCount - a.mutualConnectionCount)

    // If we don't have enough suggestions, add some recent users
    if (suggestions.length < limit) {
      const fallbackUsers = await prisma.user.findMany({
        where: {
          id: { 
            notIn: [
              ...Array.from(excludeUserIds),
              ...suggestions.map(s => s.user.id)
            ] 
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
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: limit - suggestions.length
      })

      // Add fallback suggestions
      const fallbackSuggestions = fallbackUsers.map(user => ({
        user,
        mutualConnections: [],
        mutualConnectionCount: 0
      }))

      suggestions.push(...fallbackSuggestions)
    }

    const formattedSuggestions = suggestions.slice(0, limit)
      .map(suggestion => ({
        id: suggestion.user.id,
        name: suggestion.user.name,
        username: suggestion.user.username,
        image: suggestion.user.image,
        profile: suggestion.user.profile,
        suggestion: {
          reason: suggestion.mutualConnectionCount > 0 ? 'mutual_connections' : 'new_member',
          mutualConnections: suggestion.mutualConnections.slice(0, 3), // Show up to 3 mutual connections
          mutualConnectionCount: suggestion.mutualConnectionCount,
          reasonText: suggestion.mutualConnectionCount > 0 
            ? (suggestion.mutualConnectionCount === 1 
              ? `Connected to ${suggestion.mutualConnections[0]?.name || suggestion.mutualConnections[0]?.username}`
              : `${suggestion.mutualConnectionCount} mutual connections`)
            : 'New member'
        }
      }))

    return NextResponse.json({
      suggestions: formattedSuggestions,
      hasMoreSuggestions: connectedUserIds.size === 0 ? formattedSuggestions.length > 0 : true,
      message: connectedUserIds.size === 0 && formattedSuggestions.length === 0
        ? 'Make more connections to see people you may know!'
        : connectedUserIds.size === 0
        ? 'Connect with others to find people you may know!'
        : null
    })

  } catch (error) {
    console.error('Error fetching people suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch people suggestions' },
      { status: 500 }
    )
  }
}
