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
    const type = searchParams.get('type') || 'received' // 'sent' or 'received'

    if (type === 'received') {
      // Get pending connection requests sent to the current user
      const receivedRequests = await prisma.connection.findMany({
        where: {
          connectedUserId: session.user.id,
          status: 'PENDING'
        },
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
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      return NextResponse.json({
        requests: receivedRequests.map(req => ({
          id: req.id,
          user: req.user,
          createdAt: req.createdAt,
          type: 'received'
        }))
      })
    } else {
      // Get pending connection requests sent by the current user
      const sentRequests = await prisma.connection.findMany({
        where: {
          userId: session.user.id,
          status: 'PENDING'
        },
        include: {
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
        }
      })

      return NextResponse.json({
        requests: sentRequests.map(req => ({
          id: req.id,
          user: req.connectedUser,
          createdAt: req.createdAt,
          type: 'sent'
        }))
      })
    }

  } catch (error) {
    console.error('Error fetching connection requests:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
