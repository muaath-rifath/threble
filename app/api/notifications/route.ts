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
        const limit = parseInt(searchParams.get('limit') || '20')
        const cursor = searchParams.get('cursor')
        const unreadOnly = searchParams.get('unread') === 'true'
        const type = searchParams.get('type')

        const whereClause: any = {
            userId: session.user.id
        }

        if (unreadOnly) {
            whereClause.read = false
        }

        if (type) {
            whereClause.type = type
        }

        if (cursor) {
            whereClause.createdAt = {
                lt: new Date(cursor)
            }
        }

        const notifications = await prisma.notification.findMany({
            where: whereClause,
            include: {
                actor: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        image: true
                    }
                },
                community: {
                    select: {
                        id: true,
                        name: true,
                        image: true
                    }
                },
                post: {
                    select: {
                        id: true,
                        content: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: limit
        })

        const nextCursor = notifications.length > 0
            ? notifications[notifications.length - 1].createdAt.toISOString()
            : null

        // Get unread count
        const unreadCount = await prisma.notification.count({
            where: {
                userId: session.user.id,
                read: false
            }
        })

        return NextResponse.json({
            notifications,
            nextCursor,
            hasMore: notifications.length === limit,
            unreadCount
        })

    } catch (error) {
        console.error('Error fetching notifications:', error)
        return NextResponse.json(
            { error: 'Failed to fetch notifications' },
            { status: 500 }
        )
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const {
            userId,
            type,
            message,
            communityId,
            postId,
            actorId,
            data = {}
        } = body

        // Validate required fields
        if (!userId || !type || !message) {
            return NextResponse.json(
                { error: 'Missing required fields: userId, type, message' },
                { status: 400 }
            )
        }

        // Check if the current user has permission to create notifications
        if (userId !== session.user.id) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
        }

        const notification = await prisma.notification.create({
            data: {
                userId,
                type,
                message,
                communityId,
                postId,
                actorId: actorId || session.user.id,
                data,
                read: false
            },
            include: {
                actor: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        image: true
                    }
                },
                community: {
                    select: {
                        id: true,
                        name: true,
                        image: true
                    }
                },
                post: {
                    select: {
                        id: true,
                        content: true
                    }
                }
            }
        })

        return NextResponse.json({
            success: true,
            notification
        })

    } catch (error) {
        console.error('Error creating notification:', error)
        return NextResponse.json(
            { error: 'Failed to create notification' },
            { status: 500 }
        )
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { notificationId, notificationIds, markAllRead, read = true } = body

        let updatedNotifications

        if (markAllRead) {
            // Mark all notifications as read
            updatedNotifications = await prisma.notification.updateMany({
                where: {
                    userId: session.user.id,
                    read: false
                },
                data: {
                    read: true,
                    readAt: new Date()
                }
            })
        } else if (notificationId) {
            // Mark single notification
            updatedNotifications = await prisma.notification.updateMany({
                where: {
                    id: notificationId,
                    userId: session.user.id
                },
                data: {
                    read: read,
                    readAt: read ? new Date() : null
                }
            })
        } else if (notificationIds && Array.isArray(notificationIds)) {
            // Mark multiple notifications
            updatedNotifications = await prisma.notification.updateMany({
                where: {
                    id: { in: notificationIds },
                    userId: session.user.id
                },
                data: {
                    read: read,
                    readAt: read ? new Date() : null
                }
            })
        } else {
            return NextResponse.json(
                { error: 'notificationId, notificationIds array, or markAllRead is required' },
                { status: 400 }
            )
        }

        // Get updated unread count
        const unreadCount = await prisma.notification.count({
            where: {
                userId: session.user.id,
                read: false
            }
        })

        return NextResponse.json({
            success: true,
            updatedCount: updatedNotifications.count,
            unreadCount
        })

    } catch (error) {
        console.error('Error updating notifications:', error)
        return NextResponse.json(
            { error: 'Failed to update notifications' },
            { status: 500 }
        )
    }
}
