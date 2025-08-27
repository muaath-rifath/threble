import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'

// POST - Invite a user to the community
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ communityId: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        const { communityId } = await params

        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        // Check if user has permission to invite (any community member can invite)
        const membership = await prisma.communityMember.findUnique({
            where: {
                userId_communityId: {
                    userId: session.user.id,
                    communityId
                }
            }
        })

        if (!membership) {
            return NextResponse.json({ error: 'You must be a member to invite users' }, { status: 403 })
        }

        const { username } = await req.json()

        if (!username) {
            return NextResponse.json({ error: 'Username is required' }, { status: 400 })
        }

        // Find user by username
        const inviteeUser = await prisma.user.findUnique({
            where: { username: username.toLowerCase() },
            select: {
                id: true,
                name: true,
                username: true,
                image: true
            }
        })

        if (!inviteeUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Check if user is already a member
        const existingMembership = await prisma.communityMember.findUnique({
            where: {
                userId_communityId: {
                    userId: inviteeUser.id,
                    communityId
                }
            }
        })

        if (existingMembership) {
            return NextResponse.json({ error: 'User is already a member' }, { status: 409 })
        }

        // Check if invitation already exists
        const existingInvitation = await prisma.communityInvitation.findUnique({
            where: {
                communityId_inviteeId: {
                    communityId,
                    inviteeId: inviteeUser.id
                }
            }
        })

        if (existingInvitation && existingInvitation.status === 'PENDING') {
            return NextResponse.json({ error: 'Invitation already sent' }, { status: 409 })
        }

        // Create or update invitation
        let invitation
        if (existingInvitation) {
            invitation = await prisma.communityInvitation.update({
                where: { id: existingInvitation.id },
                data: {
                    inviterId: session.user.id,
                    status: 'PENDING'
                },
                include: {
                    community: {
                        select: {
                            id: true,
                            name: true,
                            image: true
                        }
                    },
                    inviter: {
                        select: {
                            id: true,
                            name: true,
                            username: true,
                            image: true
                        }
                    },
                    invitee: {
                        select: {
                            id: true,
                            name: true,
                            username: true,
                            image: true
                        }
                    }
                }
            })
        } else {
            invitation = await prisma.communityInvitation.create({
                data: {
                    communityId,
                    inviterId: session.user.id,
                    inviteeId: inviteeUser.id,
                    status: 'PENDING'
                },
                include: {
                    community: {
                        select: {
                            id: true,
                            name: true,
                            image: true
                        }
                    },
                    inviter: {
                        select: {
                            id: true,
                            name: true,
                            username: true,
                            image: true
                        }
                    },
                    invitee: {
                        select: {
                            id: true,
                            name: true,
                            username: true,
                            image: true
                        }
                    }
                }
            })
        }

        // Create a notification for the invited user
        try {
            await prisma.notification.create({
                data: {
                    userId: inviteeUser.id,
                    type: 'COMMUNITY_INVITATION',
                    message: `${session.user.name || session.user.email} invited you to join ${invitation.community.name}`,
                    actorId: session.user.id,
                    communityId: communityId,
                    read: false
                }
            })
        } catch (notifError) {
            console.error('Failed to create notification:', notifError)
            // Continue execution even if notification fails
        }

        return NextResponse.json({ 
            message: 'Invitation sent successfully',
            invitation
        }, { status: 201 })

    } catch (error) {
        console.error('Error inviting user:', error)
        return NextResponse.json(
            { error: 'Failed to invite user' },
            { status: 500 }
        )
    }
}

// GET - List sent invitations (admin/moderator only)
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ communityId: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        const { communityId } = await params

        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        // Check if user has permission to view invitations
        const membership = await prisma.communityMember.findUnique({
            where: {
                userId_communityId: {
                    userId: session.user.id,
                    communityId
                }
            }
        })

        if (!membership || (membership.role !== 'ADMIN' && membership.role !== 'MODERATOR')) {
            return NextResponse.json({ error: 'Not authorized to view invitations' }, { status: 403 })
        }

        const { searchParams } = new URL(req.url)
        const status = searchParams.get('status') as 'PENDING' | 'ACCEPTED' | 'REJECTED' | null
        const limit = parseInt(searchParams.get('limit') || '20')
        const cursor = searchParams.get('cursor')

        let whereClause: any = { communityId }

        if (status) {
            whereClause.status = status
        } else {
            // Default to pending invitations
            whereClause.status = 'PENDING'
        }

        let cursorClause = {}
        if (cursor) {
            cursorClause = {
                cursor: { id: cursor },
                skip: 1
            }
        }

        const invitations = await prisma.communityInvitation.findMany({
            where: whereClause,
            include: {
                inviter: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        image: true
                    }
                },
                invitee: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        image: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: limit + 1,
            ...cursorClause
        })

        const hasNextPage = invitations.length > limit
        const nextCursor = hasNextPage ? invitations[limit - 1].id : null

        if (hasNextPage) {
            invitations.pop()
        }

        return NextResponse.json({
            invitations,
            nextCursor,
            hasNextPage
        })

    } catch (error) {
        console.error('Error fetching invitations:', error)
        return NextResponse.json(
            { error: 'Failed to fetch invitations' },
            { status: 500 }
        )
    }
}
