import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'

// GET - List join requests for community (admin/moderator only)
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

        // Check if user has permission to view join requests
        const membership = await prisma.communityMember.findUnique({
            where: {
                userId_communityId: {
                    userId: session.user.id,
                    communityId
                }
            }
        })

        if (!membership || (membership.role !== 'ADMIN' && membership.role !== 'MODERATOR')) {
            return NextResponse.json({ error: 'Not authorized to view join requests' }, { status: 403 })
        }

        const { searchParams } = new URL(req.url)
        const status = searchParams.get('status') as 'PENDING' | 'ACCEPTED' | 'REJECTED' | null
        const limit = parseInt(searchParams.get('limit') || '20')
        const cursor = searchParams.get('cursor')

        let whereClause: any = { communityId }

        if (status) {
            whereClause.status = status
        } else {
            // Default to pending requests
            whereClause.status = 'PENDING'
        }

        let cursorClause = {}
        if (cursor) {
            cursorClause = {
                cursor: { id: cursor },
                skip: 1
            }
        }

        const joinRequests = await prisma.joinRequest.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        image: true,
                        createdAt: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: limit + 1,
            ...cursorClause
        })

        const hasNextPage = joinRequests.length > limit
        const nextCursor = hasNextPage ? joinRequests[limit - 1].id : null

        if (hasNextPage) {
            joinRequests.pop()
        }

        return NextResponse.json({
            joinRequests,
            nextCursor,
            hasNextPage
        })

    } catch (error) {
        console.error('Error fetching join requests:', error)
        return NextResponse.json(
            { error: 'Failed to fetch join requests' },
            { status: 500 }
        )
    }
}

// POST - Create join request (handled in members route, kept for completeness)
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

        // Check if community exists and is private
        const community = await prisma.community.findUnique({
            where: { id: communityId },
            include: {
                members: {
                    where: { userId: session.user.id }
                }
            }
        })

        if (!community) {
            return NextResponse.json({ error: 'Community not found' }, { status: 404 })
        }

        // Check if user is already a member
        if (community.members.length > 0) {
            return NextResponse.json({ error: 'Already a member of this community' }, { status: 409 })
        }

        if (community.visibility === 'PUBLIC') {
            return NextResponse.json({ 
                error: 'Cannot request to join public community. Join directly instead.' 
            }, { status: 400 })
        }

        // Check if request already exists
        const existingRequest = await prisma.joinRequest.findUnique({
            where: {
                communityId_userId: {
                    communityId,
                    userId: session.user.id
                }
            }
        })

        if (existingRequest) {
            if (existingRequest.status === 'PENDING') {
                return NextResponse.json({ error: 'Join request already submitted' }, { status: 409 })
            } else if (existingRequest.status === 'REJECTED') {
                // Allow resubmission of rejected requests
                await prisma.joinRequest.update({
                    where: { id: existingRequest.id },
                    data: { 
                        status: 'PENDING',
                        updatedAt: new Date()
                    }
                })

                return NextResponse.json({ 
                    message: 'Join request resubmitted successfully' 
                }, { status: 200 })
            }
        }

        // Create new join request
        const joinRequest = await prisma.joinRequest.create({
            data: {
                communityId,
                userId: session.user.id,
                status: 'PENDING'
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

        return NextResponse.json({ 
            message: 'Join request submitted successfully',
            joinRequest
        }, { status: 201 })

    } catch (error) {
        console.error('Error creating join request:', error)
        return NextResponse.json(
            { error: 'Failed to create join request' },
            { status: 500 }
        )
    }
}
