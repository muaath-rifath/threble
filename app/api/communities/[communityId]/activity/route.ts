import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ communityId: string }> }
) {
    try {
        const { communityId } = await params
        const session = await getServerSession(authOptions)
        
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
        const cursor = searchParams.get('cursor')
        const activityTypes = searchParams.get('types')?.split(',') || []

        // Check if user is a member of the community
        const membership = await prisma.communityMember.findUnique({
            where: {
                userId_communityId: {
                    userId: session.user.id,
                    communityId
                }
            }
        })

        if (!membership) {
            return NextResponse.json({ error: 'Not a member of this community' }, { status: 403 })
        }

        // Build activity feed from various sources
        const activities = []

        // Recent posts in the community
        const recentPosts = await prisma.post.findMany({
            where: {
                communityId,
                ...(cursor && { createdAt: { lt: new Date(cursor) } })
            },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        image: true
                    }
                },
                _count: {
                    select: {
                        reactions: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: Math.ceil(limit / 3) // Allocate 1/3 of results to posts
        })

        activities.push(...recentPosts.map(post => ({
            id: `post_${post.id}`,
            type: 'POST_CREATED',
            timestamp: post.createdAt,
            actor: post.author,
            data: {
                postId: post.id,
                content: post.content.substring(0, 200) + (post.content.length > 200 ? '...' : ''),
                mediaCount: post.mediaAttachments?.length || 0,
                reactionCount: post._count.reactions
            }
        })))

        // Recent community events
        if (!activityTypes.length || activityTypes.includes('EVENT')) {
            const recentEvents = await prisma.communityEvent.findMany({
                where: {
                    communityId,
                    startTime: { gte: new Date() }, // Only upcoming events
                    ...(cursor && { createdAt: { lt: new Date(cursor) } })
                },
                include: {
                    creator: {
                        select: {
                            id: true,
                            name: true,
                            username: true,
                            image: true
                        }
                    },
                    _count: {
                        select: {
                            attendees: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: Math.ceil(limit / 3)
            })

            activities.push(...recentEvents.map(event => ({
                id: `event_${event.id}`,
                type: 'EVENT_CREATED',
                timestamp: event.createdAt,
                actor: event.creator,
                data: {
                    eventId: event.id,
                    title: event.title,
                    startTime: event.startTime,
                    location: event.location,
                    isVirtual: event.isVirtual,
                    attendeeCount: event._count.attendees
                }
            })))
        }

        // Recent member joins
        if (!activityTypes.length || activityTypes.includes('MEMBER_JOIN')) {
            const recentMembers = await prisma.communityMember.findMany({
                where: {
                    communityId,
                    ...(cursor && { joinedAt: { lt: new Date(cursor) } })
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            username: true,
                            image: true
                        }
                    }
                },
                orderBy: {
                    joinedAt: 'desc'
                },
                take: Math.ceil(limit / 3)
            })

            activities.push(...recentMembers.map(member => ({
                id: `member_${member.id}`,
                type: 'MEMBER_JOINED',
                timestamp: member.joinedAt,
                actor: member.user,
                data: {
                    role: member.role
                }
            })))
        }

        // Sort all activities by timestamp
        const sortedActivities = activities
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, limit)

        // Get next cursor for pagination
        const nextCursor = sortedActivities.length > 0
            ? sortedActivities[sortedActivities.length - 1].timestamp.toISOString()
            : null

        return NextResponse.json({
            activities: sortedActivities,
            nextCursor,
            hasMore: sortedActivities.length === limit
        })

    } catch (error) {
        console.error('Error fetching community activity:', error)
        return NextResponse.json(
            { error: 'Failed to fetch community activity' },
            { status: 500 }
        )
    }
}

// POST - Subscribe to real-time activity updates (placeholder for WebSocket implementation)
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ communityId: string }> }
) {
    try {
        const { communityId } = await params
        const session = await getServerSession(authOptions)
        
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { activityTypes = [], subscribed = true } = body

        // Check if user is a member of the community
        const membership = await prisma.communityMember.findUnique({
            where: {
                userId_communityId: {
                    userId: session.user.id,
                    communityId
                }
            }
        })

        if (!membership) {
            return NextResponse.json({ error: 'Not a member of this community' }, { status: 403 })
        }

        // Update user preferences for real-time activity notifications
        const currentUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { preferences: true }
        })

        const currentPrefs = (currentUser?.preferences as any) || {}
        const activitySubs = currentPrefs.activitySubscriptions || {}

        const updatedPreferences = await prisma.user.update({
            where: {
                id: session.user.id
            },
            data: {
                preferences: {
                    ...currentPrefs,
                    activitySubscriptions: {
                        ...activitySubs,
                        [communityId]: {
                            subscribed,
                            types: activityTypes,
                            lastUpdated: new Date().toISOString()
                        }
                    }
                }
            }
        })

        return NextResponse.json({
            success: true,
            message: subscribed ? 'Subscribed to real-time activity updates' : 'Unsubscribed from real-time updates',
            preferences: updatedPreferences.preferences
        })

    } catch (error) {
        console.error('Error updating activity subscription:', error)
        return NextResponse.json(
            { error: 'Failed to update subscription' },
            { status: 500 }
        )
    }
}
