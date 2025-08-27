import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ communityId: string; eventId: string }> }
) {
    try {
        const { communityId, eventId } = await params
        const session = await getServerSession(authOptions)
        
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

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

        const event = await prisma.communityEvent.findUnique({
            where: {
                id: eventId,
                communityId
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
                        createdAt: true,
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
                community: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                _count: {
                    select: {
                        attendees: true
                    }
                }
            }
        })

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 })
        }

        // Check user's RSVP status
        const userAttendance = event.attendees?.find((attendee: any) => attendee.user.id === session.user.id)

        return NextResponse.json({
            event: {
                ...event,
                userRsvpStatus: userAttendance?.status || 'NOT_ATTENDING',
                attendeeCount: event._count?.attendees || 0
            }
        })

    } catch (error) {
        console.error('Error fetching event details:', error)
        return NextResponse.json(
            { error: 'Failed to fetch event details' },
            { status: 500 }
        )
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ communityId: string; eventId: string }> }
) {
    try {
        const { communityId, eventId } = await params
        const session = await getServerSession(authOptions)
        
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { title, description, startTime, endTime, location, maxAttendees, tags } = body

        // Check if user is the event creator or community admin/moderator
        const event = await prisma.communityEvent.findUnique({
            where: {
                id: eventId,
                communityId
            },
            select: {
                creatorId: true
            }
        })

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 })
        }

        const isEventCreator = event.creatorId === session.user.id

        if (!isEventCreator) {
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
                    { error: 'Insufficient permissions to edit this event' },
                    { status: 403 }
                )
            }
        }

        // Validate dates if provided
        if (startTime && endTime) {
            const start = new Date(startTime)
            const end = new Date(endTime)
            
            if (start >= end) {
                return NextResponse.json(
                    { error: 'End time must be after start time' },
                    { status: 400 }
                )
            }
        }

        const updatedEvent = await prisma.communityEvent.update({
            where: {
                id: eventId
            },
            data: {
                ...(title && { title }),
                ...(description && { description }),
                ...(startTime && { startTime: new Date(startTime) }),
                ...(endTime && { endTime: new Date(endTime) }),
                ...(location && { location }),
                ...(maxAttendees && { maxAttendees }),
                ...(tags && { tags })
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
                }
            }
        })

        // Notify attendees of event changes
        const attendeeIds = updatedEvent.attendees.map(attendee => attendee.user.id)
        
        if (attendeeIds.length > 0) {
            await prisma.notification.createMany({
                data: attendeeIds.map(userId => ({
                    userId,
                    type: 'COMMUNITY_EVENT_UPDATED',
                    message: `The event "${updatedEvent.title}" has been updated`,
                    communityId,
                    data: {
                        eventId: updatedEvent.id,
                        eventTitle: updatedEvent.title
                    }
                }))
            })
        }

        return NextResponse.json({ success: true, event: updatedEvent })

    } catch (error) {
        console.error('Error updating event:', error)
        return NextResponse.json(
            { error: 'Failed to update event' },
            { status: 500 }
        )
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ communityId: string; eventId: string }> }
) {
    try {
        const { communityId, eventId } = await params
        const session = await getServerSession(authOptions)
        
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if user is the event creator or community admin/moderator
        const event = await prisma.communityEvent.findUnique({
            where: {
                id: eventId,
                communityId
            },
            include: {
                attendees: {
                    select: {
                        user: {
                            select: { id: true }
                        }
                    }
                }
            }
        })

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 })
        }

        const isEventCreator = event.creatorId === session.user.id

        if (!isEventCreator) {
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
                    { error: 'Insufficient permissions to delete this event' },
                    { status: 403 }
                )
            }
        }

        // Notify attendees of event cancellation before deleting
        const attendeeIds = event.attendees.map(attendee => attendee.user.id)
        
        if (attendeeIds.length > 0) {
            await prisma.notification.createMany({
                data: attendeeIds.map(userId => ({
                    userId,
                    type: 'COMMUNITY_EVENT_CANCELLED',
                    message: `The event "${event.title}" has been cancelled`,
                    communityId,
                    data: {
                        eventTitle: event.title,
                        scheduledFor: event.startTime.toISOString()
                    }
                }))
            })
        }

        // Delete the event (attendees will be deleted due to cascade)
        await prisma.communityEvent.delete({
            where: {
                id: eventId
            }
        })

        return NextResponse.json({ success: true, message: 'Event deleted successfully' })

    } catch (error) {
        console.error('Error deleting event:', error)
        return NextResponse.json(
            { error: 'Failed to delete event' },
            { status: 500 }
        )
    }
}
