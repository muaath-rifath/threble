import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ 
        error: 'Unauthorized' 
      }, { status: 401 })
    }

    const { targetUserId, action } = await req.json()

    if (!targetUserId || !action) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 })
    }

    if (targetUserId === session.user.id) {
      return NextResponse.json({ 
        error: 'Cannot follow/unfollow yourself' 
      }, { status: 400 })
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true }
    })

    if (!targetUser) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 })
    }

    if (action === 'follow') {
      // Create follow relationship
      await prisma.follow.create({
        data: {
          followerId: session.user.id,
          followingId: targetUserId
        }
      })
    } else if (action === 'unfollow') {
      // Remove follow relationship
      await prisma.follow.delete({
        where: {
          followerId_followingId: {
            followerId: session.user.id,
            followingId: targetUserId
          }
        }
      })
    } else {
      return NextResponse.json({ 
        error: 'Invalid action. Must be "follow" or "unfollow"' 
      }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true,
      action 
    })

  } catch (error) {
    console.error('Follow/unfollow error:', error)
    
    // Handle unique constraint violation (trying to follow someone already followed)
    if (error instanceof Error && error.message.includes('unique constraint')) {
      return NextResponse.json({ 
        error: 'Already following this user' 
      }, { status: 409 })
    }

    return NextResponse.json({ 
      error: 'An error occurred while processing the request' 
    }, { status: 500 })
  }
}
