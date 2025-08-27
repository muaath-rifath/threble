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
        const page = parseInt(searchParams.get('page') || '1')
        const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
        const upcoming = searchParams.get('upcoming') === 'true'
        const past = searchParams.get('past') === 'true'

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

        const now = new Date()
        let dateFilter = {}
        
        if (upcoming) {
            dateFilter = { startTime: { gte: now } }
        } else if (past) {
            dateFilter = { endTime: { lt: now } }
        }

        const skip = (page - 1) * limit

        const [events, totalCount] = await Promise.all([
            prisma.communityEvent.findMany({
                where: {
                    communityId,
                    ...dateFilter
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
                    attendees: {
                        select: {
                            id: true,
                            status: true,
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    username: true,
                                    image: true
                                }
                            }
                        }
                    },
                    _count: {
                        select: {
                            attendees: true
                        }
                    }
                },
                orderBy: upcoming || !past ? { startTime: 'asc' } : { startTime: 'desc' },
                skip,
                take: limit
            }),
            prisma.communityEvent.count({
                where: {
                    communityId,
                    ...dateFilter
                }
            })
        ])

        return NextResponse.json({
            events,
            pagination: {
                page,
                limit,
                total: totalCount,
                pages: Math.ceil(totalCount / limit)
            }
        })

    } catch (error) {
        console.error('Error fetching community events:', error)
        return NextResponse.json(
            { error: 'Failed to fetch events' },
            { status: 500 }
        )
    }
}

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
        const {
            title,
            description,
            startTime,
            endTime,
            location,
            isVirtual = false,
            virtualLink,
            maxAttendees,
            rsvpDeadline,
            tags = [],
            isRecurring = false,
            recurrencePattern
        } = body

        // Validate required fields
        if (!title || !startTime || !endTime) {
            return NextResponse.json(
                { error: 'Missing required fields: title, startTime, endTime' },
                { status: 400 }
            )
        }

        // Check if user is admin/moderator of the community
        const membership = await prisma.communityMember.findUnique({
            where: {
                userId_communityId: {
                    userId: session.user.id,
                    communityId
                }
            }
        })

        if (!membership || membership.role === 'USER') {
            return NextResponse.json(
                { error: 'Insufficient permissions to create events' },
                { status: 403 }
            )
        }

        // Validate dates
        const start = new Date(startTime)
        const end = new Date(endTime)
        
        if (start >= end) {
            return NextResponse.json(
                { error: 'End time must be after start time' },
                { status: 400 }
            )
        }

        if (rsvpDeadline && new Date(rsvpDeadline) > start) {
            return NextResponse.json(
                { error: 'RSVP deadline must be before event start time' },
                { status: 400 }
            )
        }

        // Create the event
        const event = await prisma.communityEvent.create({
            data: {
                title,
                description,
                startTime: start,
                endTime: end,
                location,
                isVirtual,
                virtualLink,
                maxAttendees,
                rsvpDeadline: rsvpDeadline ? new Date(rsvpDeadline) : null,
                tags,
                isRecurring,
                recurrencePattern: recurrencePattern || {},
                communityId,
                creatorId: session.user.id
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
                community: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        })

        // Create notifications for community members
        const communityMembers = await prisma.communityMember.findMany({
            where: {
                communityId,
                userId: { not: session.user.id }
            },
            select: { userId: true }
        })

        // TODO: Create notifications for all community members
        // await createEventNotifications(event, communityMembers)

        return NextResponse.json({ success: true, event })

    } catch (error) {
        console.error('Error creating community event:', error)
        return NextResponse.json(
            { error: 'Failed to create event' },
            { status: 500 }
        )
    }
}
