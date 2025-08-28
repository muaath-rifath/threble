import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'
import { z } from 'zod'

// Validation schema
const connectionActionSchema = z.object({
  targetUserId: z.string().cuid(),
  action: z.enum(['send_request', 'accept', 'reject', 'remove'])
})

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ 
        error: 'Unauthorized' 
      }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'ACCEPTED'
    const cursor = searchParams.get('cursor')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Build where clause
    const whereClause: any = {
      OR: [
        {
          userId: session.user.id,
          status: status as any
        },
        {
          connectedUserId: session.user.id,
          status: status as any
        }
      ]
    }

    // Add cursor condition if provided
    if (cursor) {
      whereClause.AND = [
        whereClause.OR ? { OR: whereClause.OR } : {},
        { id: { lt: cursor } }
      ]
      delete whereClause.OR
    }

    // Fetch user's connections based on status
    const connections = await prisma.connection.findMany({
      where: whereClause,
      include: {
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
      orderBy: {
        createdAt: 'desc'
      },
      take: limit + 1
    })

    // Check if there are more results
    const hasMore = connections.length > limit
    const data = hasMore ? connections.slice(0, -1) : connections
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null

    // Transform connections to always show the "other" user
    const transformedConnections = data.map(connection => {
      const isRequester = connection.userId === session.user.id
      const otherUser = isRequester ? connection.connectedUser : connection.user
      
      return {
        id: connection.id,
        user: otherUser,
        status: connection.status,
        createdAt: connection.createdAt,
        updatedAt: connection.updatedAt,
        isRequester
      }
    })

    return NextResponse.json({
      connections: transformedConnections,
      nextCursor,
      hasMore
    })
  } catch (error) {
    console.error('Error fetching connections:', error)
    return NextResponse.json({
      error: 'Failed to fetch connections'
    }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ 
        error: 'Unauthorized' 
      }, { status: 401 })
    }

    const body = await req.json()
    const { targetUserId, action } = connectionActionSchema.parse(body)

    if (targetUserId === session.user.id) {
      return NextResponse.json({ 
        error: 'Cannot connect to yourself' 
      }, { status: 400 })
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, username: true }
    })

    if (!targetUser) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 })
    }

    // Check for existing connection
    const existingConnection = await prisma.connection.findFirst({
      where: {
        OR: [
          {
            userId: session.user.id,
            connectedUserId: targetUserId
          },
          {
            userId: targetUserId,
            connectedUserId: session.user.id
          }
        ]
      }
    })

    switch (action) {
      case 'send_request':
        if (existingConnection) {
          return NextResponse.json({ 
            error: 'Connection already exists or request already sent' 
          }, { status: 400 })
        }

        // Create connection request
        const newConnection = await prisma.connection.create({
          data: {
            userId: session.user.id,
            connectedUserId: targetUserId,
            status: 'PENDING'
          }
        })

        // Create notification
        await prisma.notification.create({
          data: {
            type: 'CONNECTION_REQUEST',
            actorId: session.user.id,
            userId: targetUserId,
            message: `${session.user.name || session.user.username} sent you a connection request`,
            data: {
              connectionId: newConnection.id
            }
          }
        })

        return NextResponse.json({ 
          success: true, 
          connection: newConnection,
          message: 'Connection request sent successfully'
        })

      case 'accept':
        if (!existingConnection || existingConnection.status !== 'PENDING') {
          return NextResponse.json({ 
            error: 'No pending connection request found' 
          }, { status: 400 })
        }

        if (existingConnection.connectedUserId !== session.user.id) {
          return NextResponse.json({ 
            error: 'You can only accept requests sent to you' 
          }, { status: 403 })
        }

        // Update connection status
        const acceptedConnection = await prisma.connection.update({
          where: { id: existingConnection.id },
          data: { 
            status: 'ACCEPTED',
            updatedAt: new Date()
          }
        })

        // Create notification
        await prisma.notification.create({
          data: {
            type: 'CONNECTION_ACCEPTED',
            actorId: session.user.id,
            userId: existingConnection.userId,
            message: `${session.user.name || session.user.username} accepted your connection request`
          }
        })

        return NextResponse.json({ 
          success: true, 
          connection: acceptedConnection,
          message: 'Connection request accepted'
        })

      case 'reject':
        if (!existingConnection || existingConnection.status !== 'PENDING') {
          return NextResponse.json({ 
            error: 'No pending connection request found' 
          }, { status: 400 })
        }

        if (existingConnection.connectedUserId !== session.user.id) {
          return NextResponse.json({ 
            error: 'You can only reject requests sent to you' 
          }, { status: 403 })
        }

        // Update connection status
        await prisma.connection.update({
          where: { id: existingConnection.id },
          data: { 
            status: 'REJECTED',
            updatedAt: new Date()
          }
        })

        // Create notification
        await prisma.notification.create({
          data: {
            type: 'CONNECTION_REJECTED',
            actorId: session.user.id,
            userId: existingConnection.userId,
            message: `${session.user.name || session.user.username} declined your connection request`
          }
        })

        return NextResponse.json({ 
          success: true,
          message: 'Connection request rejected'
        })

      case 'remove':
        if (!existingConnection || existingConnection.status !== 'ACCEPTED') {
          return NextResponse.json({ 
            error: 'No connection found to remove' 
          }, { status: 400 })
        }

        // Delete the connection
        await prisma.connection.delete({
          where: { id: existingConnection.id }
        })

        return NextResponse.json({ 
          success: true,
          message: 'Connection removed successfully'
        })

      default:
        return NextResponse.json({ 
          error: 'Invalid action' 
        }, { status: 400 })
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data',
        details: error.issues
      }, { status: 400 })
    }

    console.error('Error managing connection:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
