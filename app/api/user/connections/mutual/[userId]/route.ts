import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { userId } = await params

    if (!session?.user?.id) {
      return NextResponse.json({ 
        error: 'Unauthorized' 
      }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!userId) {
      return NextResponse.json({ 
        error: 'User ID is required' 
      }, { status: 400 })
    }

    if (userId === session.user.id) {
      return NextResponse.json({
        connections: [],
        totalCount: 0
      })
    }

    // Get current user's connections
    const currentUserConnections = await prisma.connection.findMany({
      where: {
        OR: [
          {
            userId: session.user.id,
            status: 'ACCEPTED'
          },
          {
            connectedUserId: session.user.id,
            status: 'ACCEPTED'
          }
        ]
      },
      select: {
        userId: true,
        connectedUserId: true
      }
    })

    // Extract connected user IDs
    const currentUserConnectionIds = new Set<string>()
    currentUserConnections.forEach(conn => {
      if (conn.userId === session.user.id) {
        currentUserConnectionIds.add(conn.connectedUserId)
      } else {
        currentUserConnectionIds.add(conn.userId)
      }
    })

    // Get target user's connections
    const targetUserConnections = await prisma.connection.findMany({
      where: {
        OR: [
          {
            userId: userId,
            status: 'ACCEPTED'
          },
          {
            connectedUserId: userId,
            status: 'ACCEPTED'
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
            image: true
          }
        },
        connectedUser: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true
          }
        }
      }
    })

    // Find mutual connections
    const mutualConnections = targetUserConnections
      .map(conn => {
        const otherUserId = conn.userId === userId ? conn.connectedUserId : conn.userId
        const otherUser = conn.userId === userId ? conn.connectedUser : conn.user
        
        if (currentUserConnectionIds.has(otherUserId)) {
          return {
            id: otherUser.id,
            name: otherUser.name,
            username: otherUser.username,
            image: otherUser.image
          }
        }
        return null
      })
      .filter(Boolean)
      .slice(0, limit)

    return NextResponse.json({
      connections: mutualConnections,
      totalCount: mutualConnections.length
    })

  } catch (error) {
    console.error('Error fetching mutual connections:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
