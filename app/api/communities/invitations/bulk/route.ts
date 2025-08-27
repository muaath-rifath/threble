import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'

// POST - Send bulk invitations
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const body = await req.json()
        const { usernames, message } = body

        if (!Array.isArray(usernames) || usernames.length === 0) {
            return NextResponse.json({ error: 'Invalid usernames array' }, { status: 400 })
        }

        if (usernames.length > 50) {
            return NextResponse.json({ error: 'Cannot invite more than 50 users at once' }, { status: 400 })
        }

        const { searchParams } = new URL(req.url)
        const communityId = searchParams.get('communityId')

        if (!communityId) {
            return NextResponse.json({ error: 'Community ID required' }, { status: 400 })
        }

        // Check if user has permission to invite
        const membership = await prisma.communityMember.findUnique({
            where: {
                userId_communityId: {
                    userId: session.user.id,
                    communityId
                }
            },
            include: {
                community: {
                    select: {
                        id: true,
                        name: true,
                        visibility: true
                    }
                }
            }
        })

        if (!membership || !['ADMIN', 'MODERATOR'].includes(membership.role)) {
            return NextResponse.json({ error: 'Not authorized to invite users' }, { status: 403 })
        }

        // Find users by usernames
        const users = await prisma.user.findMany({
            where: {
                username: {
                    in: usernames
                }
            },
            select: {
                id: true,
                username: true,
                name: true,
                email: true
            }
        })

        const foundUsernames = users.map(u => u.username)
        const notFoundUsernames = usernames.filter(u => !foundUsernames.includes(u))

        // Check existing memberships and invitations
        const [existingMembers, existingInvitations] = await Promise.all([
            prisma.communityMember.findMany({
                where: {
                    communityId,
                    userId: {
                        in: users.map(u => u.id)
                    }
                },
                include: {
                    user: {
                        select: { username: true }
                    }
                }
            }),
            prisma.communityInvitation.findMany({
                where: {
                    communityId,
                    inviteeId: {
                        in: users.map(u => u.id)
                    },
                    status: 'PENDING'
                },
                include: {
                    invitee: {
                        select: { username: true }
                    }
                }
            })
        ])

        const existingMemberUsernames = existingMembers.map(m => m.user.username)
        const existingInvitationUsernames = existingInvitations.map(i => i.invitee.username)

        // Filter users who can be invited
        const usersToInvite = users.filter(user => 
            !existingMemberUsernames.includes(user.username) &&
            !existingInvitationUsernames.includes(user.username)
        )

        // Create invitation records
        const invitations = await Promise.all(
            usersToInvite.map(user => 
                prisma.communityInvitation.create({
                    data: {
                        communityId,
                        inviteeId: user.id,
                        inviterId: session.user.id
                    },
                    include: {
                        invitee: {
                            select: {
                                id: true,
                                username: true,
                                name: true
                            }
                        }
                    }
                })
            )
        )

        return NextResponse.json({
            success: true,
            results: {
                invited: invitations.length,
                alreadyMembers: existingMemberUsernames,
                alreadyInvited: existingInvitationUsernames,
                notFound: notFoundUsernames,
                invitations: invitations.map(inv => ({
                    id: inv.id,
                    username: inv.invitee.username,
                    name: inv.invitee.name
                }))
            }
        })

    } catch (error) {
        console.error('Error sending bulk invitations:', error)
        return NextResponse.json(
            { error: 'Failed to send invitations' },
            { status: 500 }
        )
    }
}

// GET - Get invitation analytics
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const communityId = searchParams.get('communityId')

        if (!communityId) {
            return NextResponse.json({ error: 'Community ID required' }, { status: 400 })
        }

        // Check permissions
        const membership = await prisma.communityMember.findUnique({
            where: {
                userId_communityId: {
                    userId: session.user.id,
                    communityId
                }
            }
        })

        if (!membership || !['ADMIN', 'MODERATOR'].includes(membership.role)) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
        }

        // Get invitation statistics
        const [pendingCount, acceptedCount, rejectedCount, recentInvitations] = await Promise.all([
            prisma.communityInvitation.count({
                where: { communityId, status: 'PENDING' }
            }),
            prisma.communityInvitation.count({
                where: { communityId, status: 'ACCEPTED' }
            }),
            prisma.communityInvitation.count({
                where: { communityId, status: 'REJECTED' }
            }),
            prisma.communityInvitation.findMany({
                where: { communityId },
                include: {
                    invitee: {
                        select: {
                            username: true,
                            name: true,
                            image: true
                        }
                    },
                    inviter: {
                        select: {
                            username: true,
                            name: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: 20
            })
        ])

        return NextResponse.json({
            stats: {
                pending: pendingCount,
                accepted: acceptedCount,
                rejected: rejectedCount,
                total: pendingCount + acceptedCount + rejectedCount
            },
            recentInvitations
        })

    } catch (error) {
        console.error('Error fetching invitation analytics:', error)
        return NextResponse.json(
            { error: 'Failed to fetch invitation data' },
            { status: 500 }
        )
    }
}
