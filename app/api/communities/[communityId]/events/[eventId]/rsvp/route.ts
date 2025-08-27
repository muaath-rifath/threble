import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'

export async function POST(
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
        const { status } = body

        if (!['ATTENDING', 'NOT_ATTENDING', 'MAYBE'].includes(status)) {
            return NextResponse.json(
                { error: 'Invalid RSVP status' },
                { status: 400 }
            )
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

        // Check if event exists and belongs to the community
        const event = await prisma.communityEvent.findUnique({
            where: {
                id: eventId,
                communityId
            },
            select: {
                id: true,
                title: true,
                startTime: true,
                maxAttendees: true,
                rsvpDeadline: true,
                _count: {
                    select: {
                        attendees: {
                            where: {
                                status: 'ATTENDING'
                            }
                        }
                    }
                }
            }
        })

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 })
        }

        // Check if RSVP deadline has passed
        if (event.rsvpDeadline && new Date() > event.rsvpDeadline) {
            return NextResponse.json({ error: 'RSVP deadline has passed' }, { status: 400 })
        }

        // Check if event is full (only for ATTENDING status)
        if (status === 'ATTENDING' && event.maxAttendees) {
            const currentAttendees = event._count.attendees
            if (currentAttendees >= event.maxAttendees) {
                return NextResponse.json({ error: 'Event is at maximum capacity' }, { status: 400 })
            }
        }

        // Upsert the RSVP
        const rsvp = await prisma.eventAttendee.upsert({
            where: {
                eventId_userId: {
                    eventId: eventId,
                    userId: session.user.id
                }
            },
            update: {
                status: status
            },
            create: {
                eventId: eventId,
                userId: session.user.id,
                status: status
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
            }
        })

        // Create notification for event creator (if not the same user)
        const eventWithCreator = await prisma.communityEvent.findUnique({
            where: { id: eventId },
            select: { creatorId: true, title: true }
        })

        if (eventWithCreator && eventWithCreator.creatorId !== session.user.id && status === 'ATTENDING') {
            await prisma.notification.create({
                data: {
                    userId: eventWithCreator.creatorId,
                    type: 'COMMUNITY_EVENT_REMINDER', // Using existing type
                    message: `Someone RSVP'd to your event "${eventWithCreator.title}"`,
                    communityId,
                    data: {
                        eventId: eventId,
                        eventTitle: eventWithCreator.title,
                        rsvpStatus: status
                    }
                }
            })
        }

        return NextResponse.json({
            success: true,
            rsvp,
            message: `Successfully ${status === 'ATTENDING' ? 'joined' : status === 'NOT_ATTENDING' ? 'declined' : 'marked as maybe for'} the event`
        })

    } catch (error) {
        console.error('Error updating RSVP:', error)
        return NextResponse.json(
            { error: 'Failed to update RSVP' },
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

        // Delete the RSVP
        await prisma.eventAttendee.deleteMany({
            where: {
                eventId: eventId,
                userId: session.user.id
            }
        })

        return NextResponse.json({
            success: true,
            message: 'RSVP removed successfully'
        })

    } catch (error) {
        console.error('Error removing RSVP:', error)
        return NextResponse.json(
            { error: 'Failed to remove RSVP' },
            { status: 500 }
        )
    }
}
