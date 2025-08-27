import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'

// DELETE - Remove a member from community (admin/moderator only)
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ communityId: string; memberId: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        const { communityId, memberId } = await params

        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        // Get current user's membership to check permissions
        const currentUserMembership = await prisma.communityMember.findUnique({
            where: {
                userId_communityId: {
                    userId: session.user.id,
                    communityId
                }
            }
        })

        // Only admins and moderators can remove members
        if (!currentUserMembership || !['ADMIN', 'MODERATOR'].includes(currentUserMembership.role)) {
            return NextResponse.json({ error: 'Not authorized to remove members' }, { status: 403 })
        }

        // Get the member to be removed
        const memberToRemove = await prisma.communityMember.findUnique({
            where: { id: memberId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        username: true
                    }
                },
                community: {
                    select: {
                        id: true,
                        name: true,
                        creatorId: true
                    }
                }
            }
        })

        if (!memberToRemove) {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 })
        }

        // Prevent removing the community creator
        if (memberToRemove.community.creatorId === memberToRemove.userId) {
            return NextResponse.json(
                { error: 'Cannot remove community creator' },
                { status: 400 }
            )
        }

        // Only admins can remove other admins/moderators
        if (currentUserMembership.role === 'MODERATOR' && 
            ['ADMIN', 'MODERATOR'].includes(memberToRemove.role)) {
            return NextResponse.json(
                { error: 'Moderators cannot remove admins or other moderators' },
                { status: 403 }
            )
        }

        // Remove the member
        await prisma.communityMember.delete({
            where: { id: memberId }
        })

        return NextResponse.json({ 
            success: true,
            message: `${memberToRemove.user.name || memberToRemove.user.username} has been removed from the community`
        })

    } catch (error) {
        console.error('Error removing member:', error)
        return NextResponse.json(
            { error: 'Failed to remove member' },
            { status: 500 }
        )
    }
}
