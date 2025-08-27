import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'

// PUT - Handle join request (accept/reject)
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ communityId: string; requestId: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        const { communityId, requestId } = await params

        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        // Check if user has permission to handle requests
        const membership = await prisma.communityMember.findUnique({
            where: {
                userId_communityId: {
                    userId: session.user.id,
                    communityId
                }
            }
        })

        if (!membership || (membership.role !== 'ADMIN' && membership.role !== 'MODERATOR')) {
            return NextResponse.json({ error: 'Not authorized to handle join requests' }, { status: 403 })
        }

        // Get the join request
        const joinRequest = await prisma.joinRequest.findUnique({
            where: { id: requestId },
            include: {
                user: {
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

        if (!joinRequest) {
            return NextResponse.json({ error: 'Join request not found' }, { status: 404 })
        }

        if (joinRequest.communityId !== communityId) {
            return NextResponse.json({ error: 'Join request does not belong to this community' }, { status: 400 })
        }

        if (joinRequest.status !== 'PENDING') {
            return NextResponse.json({ error: 'Join request has already been processed' }, { status: 409 })
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
                        userId: joinRequest.userId,
                        communityId: joinRequest.communityId
                    }
                }
            })

            if (existingMembership) {
                // Update request status but don't create duplicate membership
                await prisma.joinRequest.update({
                    where: { id: requestId },
                    data: { status: 'ACCEPTED' }
                })

                return NextResponse.json({ 
                    message: 'User is already a member',
                    joinRequest: { ...joinRequest, status: 'ACCEPTED' }
                })
            }

            // Accept the request and create membership
            const result = await prisma.$transaction(async (tx) => {
                const updatedRequest = await tx.joinRequest.update({
                    where: { id: requestId },
                    data: { status: 'ACCEPTED' }
                })

                const membership = await tx.communityMember.create({
                    data: {
                        userId: joinRequest.userId,
                        communityId: joinRequest.communityId,
                        role: 'USER'
                    }
                })

                return { updatedRequest, membership }
            })

            return NextResponse.json({ 
                message: 'Join request accepted successfully',
                joinRequest: { ...joinRequest, status: 'ACCEPTED' },
                membership: result.membership
            })

        } else {
            // Reject the request
            const updatedRequest = await prisma.joinRequest.update({
                where: { id: requestId },
                data: { status: 'REJECTED' }
            })

            return NextResponse.json({ 
                message: 'Join request rejected',
                joinRequest: { ...joinRequest, status: 'REJECTED' }
            })
        }

    } catch (error) {
        console.error('Error handling join request:', error)
        return NextResponse.json(
            { error: 'Failed to handle join request' },
            { status: 500 }
        )
    }
}

// DELETE - Cancel join request
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ communityId: string; requestId: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        const { communityId, requestId } = await params

        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        // Find the join request
        const joinRequest = await prisma.joinRequest.findUnique({
            where: { id: requestId },
            include: {
                community: true
            }
        })

        if (!joinRequest) {
            return NextResponse.json({ error: 'Join request not found' }, { status: 404 })
        }

        // Verify the request belongs to the correct community
        if (joinRequest.communityId !== communityId) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
        }

        // Only the requester can cancel their own request
        if (joinRequest.userId !== session.user.id) {
            return NextResponse.json({ error: 'Not authorized to cancel this request' }, { status: 403 })
        }

        // Delete the join request
        await prisma.joinRequest.delete({
            where: { id: requestId }
        })

        return NextResponse.json({
            message: 'Join request cancelled successfully'
        })

    } catch (error) {
        console.error('Error cancelling join request:', error)
        return NextResponse.json(
            { error: 'Failed to cancel join request' },
            { status: 500 }
        )
    }
}