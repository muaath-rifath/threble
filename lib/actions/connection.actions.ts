'use server'

import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'

export async function sendConnectionRequest(targetUserId: string) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    if (targetUserId === session.user.id) {
      return { success: false, error: 'Cannot connect to yourself' }
    }

    // Check if connection already exists
    const existingConnection = await prisma.connection.findFirst({
      where: {
        OR: [
          { userId: session.user.id, connectedUserId: targetUserId },
          { userId: targetUserId, connectedUserId: session.user.id }
        ]
      }
    })

    if (existingConnection) {
      return { success: false, error: 'Connection already exists or request already sent' }
    }

    // Create connection request
    await prisma.connection.create({
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
        userId: targetUserId,
        actorId: session.user.id,
        message: `${session.user.name || session.user.username} sent you a connection request`
      }
    })

    revalidatePath('/connections')
    return { success: true, message: 'Connection request sent successfully' }
  } catch (error) {
    console.error('Error sending connection request:', error)
    return { success: false, error: 'Failed to send connection request' }
  }
}

export async function acceptConnectionRequest(requestId: string) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const connection = await prisma.connection.findUnique({
      where: { id: requestId },
      include: { user: true }
    })

    if (!connection || connection.connectedUserId !== session.user.id) {
      return { success: false, error: 'Connection request not found' }
    }

    if (connection.status !== 'PENDING') {
      return { success: false, error: 'Connection request is not pending' }
    }

    // Update connection status
    await prisma.connection.update({
      where: { id: requestId },
      data: { 
        status: 'ACCEPTED',
        updatedAt: new Date()
      }
    })

    // Create notification
    await prisma.notification.create({
      data: {
        type: 'CONNECTION_ACCEPTED',
        userId: connection.userId,
        actorId: session.user.id,
        message: `${session.user.name || session.user.username} accepted your connection request`
      }
    })

    revalidatePath('/connections')
    return { success: true, message: 'Connection request accepted' }
  } catch (error) {
    console.error('Error accepting connection request:', error)
    return { success: false, error: 'Failed to accept connection request' }
  }
}

export async function rejectConnectionRequest(requestId: string) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const connection = await prisma.connection.findUnique({
      where: { id: requestId }
    })

    if (!connection || connection.connectedUserId !== session.user.id) {
      return { success: false, error: 'Connection request not found' }
    }

    if (connection.status !== 'PENDING') {
      return { success: false, error: 'Connection request is not pending' }
    }

    // Update connection status
    await prisma.connection.update({
      where: { id: requestId },
      data: { 
        status: 'REJECTED',
        updatedAt: new Date()
      }
    })

    revalidatePath('/connections')
    return { success: true, message: 'Connection request rejected' }
  } catch (error) {
    console.error('Error rejecting connection request:', error)
    return { success: false, error: 'Failed to reject connection request' }
  }
}

export async function removeConnection(targetUserId: string) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const connection = await prisma.connection.findFirst({
      where: {
        OR: [
          { userId: session.user.id, connectedUserId: targetUserId },
          { userId: targetUserId, connectedUserId: session.user.id }
        ],
        status: 'ACCEPTED'
      }
    })

    if (!connection) {
      return { success: false, error: 'Connection not found' }
    }

    // Delete the connection
    await prisma.connection.delete({
      where: { id: connection.id }
    })

    revalidatePath('/connections')
    return { success: true, message: 'Connection removed successfully' }
  } catch (error) {
    console.error('Error removing connection:', error)
    return { success: false, error: 'Failed to remove connection' }
  }
}

export async function getConnectionStatus(targetUserId: string) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return { status: null, canConnect: false }
    }

    if (targetUserId === session.user.id) {
      return { status: 'self', canConnect: false }
    }

    const connection = await prisma.connection.findFirst({
      where: {
        OR: [
          { userId: session.user.id, connectedUserId: targetUserId },
          { userId: targetUserId, connectedUserId: session.user.id }
        ]
      }
    })

    if (!connection) {
      return { status: 'not_connected', canConnect: true }
    }

    const isRequester = connection.userId === session.user.id

    switch (connection.status) {
      case 'PENDING':
        return {
          status: isRequester ? 'request_sent' : 'request_received',
          canConnect: !isRequester
        }
      case 'ACCEPTED':
        return { status: 'connected', canConnect: false }
      case 'REJECTED':
        return { status: 'rejected', canConnect: false }
      case 'BLOCKED':
        return { status: 'blocked', canConnect: false }
      default:
        return { status: 'unknown', canConnect: false }
    }
  } catch (error) {
    console.error('Error getting connection status:', error)
    return { status: null, canConnect: false }
  }
}
