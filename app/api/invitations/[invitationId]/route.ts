import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'

// PUT - Accept/reject an invitation
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ invitationId: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        const { invitationId } = await params

        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        // Get the invitation
        const invitation = await prisma.communityInvitation.findUnique({
            where: { id: invitationId },
            include: {
                community: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                inviter: {
                    select: {
                        id: true,
                        name: true,
                        username: true
                    }
                }
            }
        })

        if (!invitation) {
            return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
        }

        if (invitation.inviteeId !== session.user.id) {
            return NextResponse.json({ error: 'Not authorized to handle this invitation' }, { status: 403 })
        }

        if (invitation.status !== 'PENDING') {
            return NextResponse.json({ error: 'Invitation has already been processed' }, { status: 409 })
        }

        const { action } = await req.json()

        if (!action || !['accept', 'reject'].includes(action)) {
            return NextResponse.json({ error: 'Invalid action. Must be "accept" or "reject"' }, { status: 400 })
        }

        if (action === 'accept') {
            // Check if user is already a member (race condition check)
            const existingMembership = await prisma.communityMember.findUnique({
                where: {
                    userId_communityId: {
                        userId: session.user.id,
                        communityId: invitation.communityId
                    }
                }
            })

            if (existingMembership) {
                // Update invitation status but don't create duplicate membership
                await prisma.communityInvitation.update({
                    where: { id: invitationId },
                    data: { status: 'ACCEPTED' }
                })

                return NextResponse.json({ 
                    message: 'You are already a member of this community',
                    invitation: { ...invitation, status: 'ACCEPTED' }
                })
            }

            // Accept the invitation and create membership
            const result = await prisma.$transaction(async (tx) => {
                const updatedInvitation = await tx.communityInvitation.update({
                    where: { id: invitationId },
                    data: { status: 'ACCEPTED' }
                })

                const membership = await tx.communityMember.create({
                    data: {
                        userId: session.user.id,
                        communityId: invitation.communityId,
                        role: 'USER'
                    }
                })

                return { updatedInvitation, membership }
            })

            return NextResponse.json({ 
                message: 'Invitation accepted successfully',
                invitation: { ...invitation, status: 'ACCEPTED' },
                membership: result.membership
            })

        } else {
            // Reject the invitation
            const updatedInvitation = await prisma.communityInvitation.update({
                where: { id: invitationId },
                data: { status: 'REJECTED' }
            })

            return NextResponse.json({ 
                message: 'Invitation rejected',
                invitation: { ...invitation, status: 'REJECTED' }
            })
        }

    } catch (error) {
        console.error('Error handling invitation:', error)
        return NextResponse.json(
            { error: 'Failed to handle invitation' },
            { status: 500 }
        )
    }
}

// DELETE - Delete an invitation (by invitee or admin/moderator who sent it)
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ invitationId: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        const { invitationId } = await params

        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        // Get the invitation
        const invitation = await prisma.communityInvitation.findUnique({
            where: { id: invitationId }
        })

        if (!invitation) {
            return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
        }

        // Check permissions - either the invitee themselves or admin/moderator who can manage invitations
        const isInvitee = invitation.inviteeId === session.user.id
        let hasPermission = isInvitee

        if (!isInvitee) {
            const membership = await prisma.communityMember.findUnique({
                where: {
                    userId_communityId: {
                        userId: session.user.id,
                        communityId: invitation.communityId
                    }
                }
            })

            hasPermission = membership ? (membership.role === 'ADMIN' || membership.role === 'MODERATOR') : false
        }

        if (!hasPermission) {
            return NextResponse.json({ error: 'Not authorized to delete this invitation' }, { status: 403 })
        }

        // Delete the invitation
        await prisma.communityInvitation.delete({
            where: { id: invitationId }
        })

        return NextResponse.json({ message: 'Invitation deleted successfully' })

    } catch (error) {
        console.error('Error deleting invitation:', error)
        return NextResponse.json(
            { error: 'Failed to delete invitation' },
            { status: 500 }
        )
    }
}
