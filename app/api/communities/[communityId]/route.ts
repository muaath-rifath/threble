import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'

// GET - Get community by ID
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

        const community = await prisma.community.findUnique({
            where: { id: communityId },
            include: {
                creator: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        image: true
                    }
                },
                members: {
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
                },
                _count: {
                    select: {
                        members: true,
                        posts: true
                    }
                }
            }
        })

        if (!community) {
            return NextResponse.json({ error: 'Community not found' }, { status: 404 })
        }

        // Check if user has access to private community
        if (community.visibility === 'PRIVATE') {
            const isMember = community.members.some(
                member => member.userId === session.user.id
            )
            
            if (!isMember) {
                return NextResponse.json({ error: 'Access denied' }, { status: 403 })
            }
        }

        return NextResponse.json({
            community,
            currentUserMembership: community.members.find(
                member => member.userId === session.user.id
            ) || null
        })

    } catch (error) {
        console.error('Error fetching community:', error)
        return NextResponse.json(
            { error: 'Failed to fetch community' },
            { status: 500 }
        )
    }
}

// PUT - Update community (admin only)
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ communityId: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        const { communityId } = await params

        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        // Check if user is admin of the community
        const membership = await prisma.communityMember.findUnique({
            where: {
                userId_communityId: {
                    userId: session.user.id,
                    communityId
                }
            }
        })

        if (!membership || membership.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Not authorized to update community' }, { status: 403 })
        }

        const body = await req.json()
        const { name, description, visibility, image, coverImage } = body

        // Check if new name is unique (if being changed)
        if (name) {
            const existingCommunity = await prisma.community.findFirst({
                where: {
                    name,
                    NOT: { id: communityId }
                }
            })

            if (existingCommunity) {
                return NextResponse.json({ error: 'Community name already exists' }, { status: 400 })
            }
        }

        const updatedCommunity = await prisma.community.update({
            where: { id: communityId },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(visibility && { visibility }),
                ...(image !== undefined && { image }),
                ...(coverImage !== undefined && { coverImage })
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
                _count: {
                    select: {
                        members: true,
                        posts: true
                    }
                }
            }
        })

        return NextResponse.json({
            message: 'Community updated successfully',
            community: updatedCommunity
        })

    } catch (error) {
        console.error('Error updating community:', error)
        return NextResponse.json(
            { error: 'Failed to update community' },
            { status: 500 }
        )
    }
}

// DELETE - Delete community (admin only)
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ communityId: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        const { communityId } = await params

        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        // Check if user is admin of the community
        const membership = await prisma.communityMember.findUnique({
            where: {
                userId_communityId: {
                    userId: session.user.id,
                    communityId
                }
            }
        })

        if (!membership || membership.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Not authorized to delete community' }, { status: 403 })
        }

        // Delete community (cascade will handle related records)
        await prisma.community.delete({
            where: { id: communityId }
        })

        return NextResponse.json({
            message: 'Community deleted successfully'
        })

    } catch (error) {
        console.error('Error deleting community:', error)
        return NextResponse.json(
            { error: 'Failed to delete community' },
            { status: 500 }
        )
    }
}
