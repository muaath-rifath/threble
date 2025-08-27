import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'

// GET - List communities with search, filtering, pagination
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        
        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const search = searchParams.get('search')
        const name = searchParams.get('name')  // Support fetching by exact name
        const visibility = searchParams.get('visibility') as 'PUBLIC' | 'PRIVATE' | null
        const limit = parseInt(searchParams.get('limit') || '20')
        const cursor = searchParams.get('cursor')
        const myCommunitiesOnly = searchParams.get('myCommunitiesOnly') === 'true'

        // If fetching by name, return single community
        if (name) {
            const community = await prisma.community.findUnique({
                where: { name },
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

            // Check if community is private and user is not a member
            if (community.visibility === 'PRIVATE') {
                const isMember = community.members.some(member => member.userId === session.user.id)
                if (!isMember && community.creatorId !== session.user.id) {
                    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
                }
            }

            // Get current user's membership
            const userMembership = community.members.find(
                member => member.userId === session.user.id
            )

            return NextResponse.json({
                community,
                userMembership: userMembership || null
            })
        }

        let whereClause: any = {}

        // Add search filter
        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ]
        }

        // Add visibility filter
        if (visibility) {
            whereClause.visibility = visibility
        } else {
            // For non-admin users, only show public communities unless specifically requesting their own
            if (!myCommunitiesOnly) {
                whereClause.visibility = 'PUBLIC'
            }
        }

        // Filter for user's communities only
        if (myCommunitiesOnly) {
            whereClause.members = {
                some: {
                    userId: session.user.id
                }
            }
        }

        // Add cursor pagination
        let cursorClause = {}
        if (cursor) {
            cursorClause = {
                cursor: { id: cursor },
                skip: 1
            }
        }

        const communities = await prisma.community.findMany({
            where: whereClause,
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
            },
            orderBy: { createdAt: 'desc' },
            take: limit + 1,
            ...cursorClause
        })

        const hasNextPage = communities.length > limit
        const nextCursor = hasNextPage ? communities[limit - 1].id : null

        if (hasNextPage) {
            communities.pop() // Remove the extra item used for pagination
        }

        // Add current user's membership status to each community
        const communitiesWithMembership = await Promise.all(
            communities.map(async (community) => {
                const currentUserMembership = community.members.find(
                    member => member.userId === session.user.id
                )

                return {
                    ...community,
                    currentUserMembership: currentUserMembership || null
                }
            })
        )

        return NextResponse.json({
            communities: communitiesWithMembership,
            nextCursor,
            hasNextPage
        })

    } catch (error) {
        console.error('Error fetching communities:', error)
        return NextResponse.json(
            { error: 'Failed to fetch communities' },
            { status: 500 }
        )
    }
}

// POST - Create new community with validation and file upload
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        
        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        // Check if user exists in database
        const user = await prisma.user.findUnique({
            where: { id: session.user.id }
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const formData = await req.formData()
        const name = formData.get('name') as string
        const description = formData.get('description') as string
        const visibility = formData.get('visibility') as 'PUBLIC' | 'PRIVATE'

        // Validation
        if (!name || name.trim().length === 0) {
            return NextResponse.json({ error: 'Community name is required' }, { status: 400 })
        }

        if (name.length > 50) {
            return NextResponse.json({ error: 'Community name must be 50 characters or less' }, { status: 400 })
        }

        if (description && description.length > 500) {
            return NextResponse.json({ error: 'Description must be 500 characters or less' }, { status: 400 })
        }

        // Check if community name already exists (case-insensitive)
        const existingCommunity = await prisma.community.findFirst({
            where: {
                name: {
                    equals: name,
                    mode: 'insensitive'
                }
            }
        })

        if (existingCommunity) {
            return NextResponse.json({ error: 'Community name already exists' }, { status: 409 })
        }

        // Create community and add creator as admin in a transaction
        const result = await prisma.$transaction(async (tx) => {
            const community = await tx.community.create({
                data: {
                    name: name.trim(),
                    description: description?.trim() || null,
                    visibility: visibility || 'PUBLIC',
                    creatorId: session.user.id
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

            // Add creator as admin member
            await tx.communityMember.create({
                data: {
                    userId: session.user.id,
                    communityId: community.id,
                    role: 'ADMIN'
                }
            })

            return community
        })

        return NextResponse.json({ community: result }, { status: 201 })

    } catch (error) {
        console.error('Error creating community:', error)
        return NextResponse.json(
            { error: 'Failed to create community' },
            { status: 500 }
        )
    }
}
