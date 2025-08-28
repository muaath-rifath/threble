import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'

export async function joinCommunityAction(communityId: string) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return { error: 'Not authenticated' }
  }

  try {
    // Check if community exists
    const community = await prisma.community.findUnique({
      where: { id: communityId }
    })

    if (!community) {
      return { error: 'Community not found' }
    }

    // Check if user is already a member
    const existingMember = await prisma.communityMember.findUnique({
      where: {
        userId_communityId: {
          userId: session.user.id,
          communityId
        }
      }
    })

    if (existingMember) {
      return { error: 'Already a member' }
    }

    // For public communities, add user directly
    if (community.visibility === 'PUBLIC') {
      const member = await prisma.communityMember.create({
        data: {
          userId: session.user.id,
          communityId,
          role: 'USER'
        }
      })

      return { success: true, member }
    } else {
      // For private communities, create join request
      const existingRequest = await prisma.joinRequest.findUnique({
        where: {
          communityId_userId: {
            userId: session.user.id,
            communityId
          }
        }
      })

      if (existingRequest) {
        return { error: 'Join request already pending' }
      }

      const joinRequest = await prisma.joinRequest.create({
        data: {
          userId: session.user.id,
          communityId
        }
      })

      return { success: true, joinRequest, message: 'Join request sent' }
    }
  } catch (error) {
    console.error('Error joining community:', error)
    return { error: 'Failed to join community' }
  }
}

export async function sendConnectionRequestAction(targetUserId: string) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return { error: 'Not authenticated' }
  }

  try {
    if (targetUserId === session.user.id) {
      return { error: 'Cannot connect to yourself' }
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId }
    })

    if (!targetUser) {
      return { error: 'User not found' }
    }

    // Check for existing connection
    const existingConnection = await prisma.connection.findFirst({
      where: {
        OR: [
          { userId: session.user.id, connectedUserId: targetUserId },
          { userId: targetUserId, connectedUserId: session.user.id }
        ]
      }
    })

    if (existingConnection) {
      return { error: 'Connection already exists or request already sent' }
    }

    // Create connection request
    const connection = await prisma.connection.create({
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
        message: `${session.user.name || session.user.username} sent you a connection request`
      }
    })

    return { success: true, connection }
  } catch (error) {
    console.error('Error sending connection request:', error)
    return { error: 'Failed to send connection request' }
  }
}
