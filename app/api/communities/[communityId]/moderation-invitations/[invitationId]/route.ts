import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'

// PATCH - Accept or decline moderation invitation
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ communityId: string; invitationId: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        const { communityId, invitationId } = await params

        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const body = await req.json()
        const { action } = body // 'accept' or 'decline'

        if (!action || !['accept', 'decline'].includes(action)) {
            return NextResponse.json({ 
                error: 'Invalid action. Must be "accept" or "decline"' 
            }, { status: 400 })
        }

        // Find the invitation
        const invitation = await prisma.moderationInvitation.findUnique({
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

        if (!invitation) {
            return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
        }

        // Check if user is the invitee
        if (invitation.inviteeId !== session.user.id) {
            return NextResponse.json({ 
                error: 'Not authorized to respond to this invitation' 
            }, { status: 403 })
        }

        // Check if invitation is still pending
        if (invitation.status !== 'PENDING') {
            return NextResponse.json({ 
                error: 'Invitation has already been responded to' 
            }, { status: 409 })
        }

        // Check if invitation belongs to the specified community
        if (invitation.communityId !== communityId) {
            return NextResponse.json({ 
                error: 'Invitation does not belong to this community' 
            }, { status: 400 })
        }

        const status = action === 'accept' ? 'ACCEPTED' : 'DECLINED'
        
        // Update invitation status
        const updatedInvitation = await prisma.moderationInvitation.update({
            where: { id: invitationId },
            data: { 
                status,
                respondedAt: new Date()
            }
        })

        // If accepted, update the user's role in the community
        if (action === 'accept') {
            // Check if user is already a member of the community
            const existingMembership = await prisma.communityMember.findUnique({
                where: {
                    userId_communityId: {
                        userId: session.user.id,
                        communityId
                    }
                }
            })

            if (existingMembership) {
                // Update role
                await prisma.communityMember.update({
                    where: { id: existingMembership.id },
                    data: { role: invitation.role }
                })
            } else {
                // Create new membership with the assigned role
                await prisma.communityMember.create({
                    data: {
                        userId: session.user.id,
                        communityId,
                        role: invitation.role
                    }
                })
            }
        }

        // Create notification for the admin who sent the invitation
        try {
            const inviteeName = invitation.invitee.name || invitation.invitee.username || 'Someone'
            const roleDisplay = invitation.role.toLowerCase()
            
            const notificationMessage = action === 'accept'
                ? `${inviteeName} has accepted your invitation to become a ${roleDisplay} of ${invitation.community.name}`
                : `${inviteeName} has declined your invitation to become a ${roleDisplay} of ${invitation.community.name}`

            await prisma.notification.create({
                data: {
                    userId: invitation.inviterId,
                    type: action === 'accept' ? 'COMMUNITY_MODERATION_ACCEPTED' : 'COMMUNITY_MODERATION_DECLINED',
                    message: notificationMessage,
                    actorId: session.user.id,
                    communityId: communityId,
                    read: false,
                    data: {
                        invitationId: invitation.id,
                        action: action,
                        role: invitation.role,
                        communityName: invitation.community.name
                    }
                }
            })
        } catch (notificationError) {
            console.error('Failed to create invitation response notification:', notificationError)
            // Continue execution even if notification fails
        }

        const responseMessage = action === 'accept'
            ? `You have accepted the invitation to become a ${invitation.role.toLowerCase()} of ${invitation.community.name}`
            : `You have declined the invitation to become a ${invitation.role.toLowerCase()} of ${invitation.community.name}`

        return NextResponse.json({ 
            message: responseMessage,
            invitation: updatedInvitation,
            action
        })

    } catch (error) {
        console.error('Error responding to moderation invitation:', error)
        return NextResponse.json(
            { error: 'Failed to respond to invitation' },
            { status: 500 }
        )
    }
}

// GET - Get invitation details
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ communityId: string; invitationId: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        const { communityId, invitationId } = await params

        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        // Find the invitation
        const invitation = await prisma.moderationInvitation.findUnique({
            where: { id: invitationId },
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
                }
            }
        })

        if (!invitation) {
            return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
        }

        // Check if user is the invitee
        if (invitation.inviteeId !== session.user.id) {
            return NextResponse.json({ 
                error: 'Not authorized to view this invitation' 
            }, { status: 403 })
        }

        // Check if invitation belongs to the specified community
        if (invitation.communityId !== communityId) {
            return NextResponse.json({ 
                error: 'Invitation does not belong to this community' 
            }, { status: 400 })
        }

        return NextResponse.json({ invitation })

    } catch (error) {
        console.error('Error fetching moderation invitation:', error)
        return NextResponse.json(
            { error: 'Failed to fetch invitation' },
            { status: 500 }
        )
    }
}