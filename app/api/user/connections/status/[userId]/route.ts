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

    if (!userId) {
      return NextResponse.json({ 
        error: 'User ID is required' 
      }, { status: 400 })
    }

    if (userId === session.user.id) {
      return NextResponse.json({ 
        status: 'self',
        canConnect: false
      })
    }

    // Check for existing connection
    const connection = await prisma.connection.findFirst({
      where: {
        OR: [
          {
            userId: session.user.id,
            connectedUserId: userId
          },
          {
            userId: userId,
            connectedUserId: session.user.id
          }
        ]
      }
    })

    if (!connection) {
      return NextResponse.json({
        status: 'not_connected',
        canConnect: true
      })
    }

    // Determine the relationship from current user's perspective
    const isRequester = connection.userId === session.user.id
    
    let status: string
    let canConnect = false

    switch (connection.status) {
      case 'PENDING':
        status = isRequester ? 'request_sent' : 'request_received'
        canConnect = !isRequester // Only recipient can accept
        break
      case 'ACCEPTED':
        status = 'connected'
        canConnect = false
        break
      case 'REJECTED':
        status = 'rejected'
        canConnect = false // Could be changed to true if you want to allow retry
        break
      case 'BLOCKED':
        status = 'blocked'
        canConnect = false
        break
      default:
        status = 'unknown'
        canConnect = false
    }

    return NextResponse.json({
      status,
      canConnect,
      connectionId: connection.id,
      createdAt: connection.createdAt,
      isRequester
    })

  } catch (error) {
    console.error('Error checking connection status:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
