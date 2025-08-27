import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'

// PUT - Update member role (admin only)
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ communityId: string; memberId: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        const { communityId, memberId } = await params

        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        // Check if current user has permission to change roles (only admins)
        const currentUserMembership = await prisma.communityMember.findUnique({
            where: {
                userId_communityId: {
                    userId: session.user.id,
                    communityId
                }
            }
        })

        if (!currentUserMembership || currentUserMembership.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Not authorized to change member roles' }, { status: 403 })
        }

        // Get target member
        const targetMember = await prisma.communityMember.findUnique({
            where: { id: memberId },
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

        if (!targetMember || targetMember.communityId !== communityId) {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 })
        }

        const { role } = await req.json()

        if (!role || !['USER', 'MODERATOR', 'ADMIN'].includes(role)) {
            return NextResponse.json({ error: 'Invalid role. Must be USER, MODERATOR, or ADMIN' }, { status: 400 })
        }

        // Prevent changing own role if it would leave no admins
        if (targetMember.userId === session.user.id && targetMember.role === 'ADMIN' && role !== 'ADMIN') {
            const adminCount = await prisma.communityMember.count({
                where: {
                    communityId,
                    role: 'ADMIN'
                }
            })

            if (adminCount === 1) {
                return NextResponse.json({ 
                    error: 'Cannot change role: At least one admin is required' 
                }, { status: 409 })
            }
        }

        // Update role
        const updatedMember = await prisma.communityMember.update({
            where: { id: memberId },
            data: { role },
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

        return NextResponse.json({ 
            message: 'Member role updated successfully',
            member: updatedMember
        })

    } catch (error) {
        console.error('Error updating member role:', error)
        return NextResponse.json(
            { error: 'Failed to update member role' },
            { status: 500 }
        )
    }
}
