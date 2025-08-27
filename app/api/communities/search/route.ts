import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'

// GET - Advanced community search
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        
        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const query = searchParams.get('q') || ''
        const sort = searchParams.get('sort') || 'relevant' // relevant, popular, recent, name
        const visibility = searchParams.get('visibility') as 'PUBLIC' | 'PRIVATE' | null
        const limit = parseInt(searchParams.get('limit') || '20')
        const offset = parseInt(searchParams.get('offset') || '0')

        let whereClause: any = {
            visibility: 'PUBLIC' // Default to public communities for search
        }

        // Add visibility filter if specified
        if (visibility) {
            whereClause.visibility = visibility
        }

        // Add search query filter
        if (query.trim()) {
            whereClause.OR = [
                { name: { contains: query.trim(), mode: 'insensitive' } },
                { description: { contains: query.trim(), mode: 'insensitive' } }
            ]
        }

        // Define sorting options
        let orderBy: any = { createdAt: 'desc' } // default

        switch (sort) {
            case 'popular':
                orderBy = [
                    { members: { _count: 'desc' } },
                    { posts: { _count: 'desc' } },
                    { createdAt: 'desc' }
                ]
                break
            case 'recent':
                orderBy = { createdAt: 'desc' }
                break
            case 'name':
                orderBy = { name: 'asc' }
                break
            case 'relevant':
            default:
                // For relevant search, prioritize by name match first, then description
                if (query.trim()) {
                    orderBy = [
                        { name: 'asc' }, // Alphabetical for relevance
                        { createdAt: 'desc' }
                    ]
                } else {
                    orderBy = { createdAt: 'desc' }
                }
                break
        }

        const [communities, totalCount] = await Promise.all([
            prisma.community.findMany({
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
                    _count: {
                        select: {
                            members: true,
                            posts: true
                        }
                    }
                },
                orderBy,
                take: limit,
                skip: offset
            }),
            prisma.community.count({ where: whereClause })
        ])

        // Add current user's membership status to each community
        const communitiesWithMembership = await Promise.all(
            communities.map(async (community) => {
                const currentUserMembership = await prisma.communityMember.findUnique({
                    where: {
                        userId_communityId: {
                            userId: session.user.id,
                            communityId: community.id
                        }
                    },
                    select: {
                        id: true,
                        role: true,
                        joinedAt: true
                    }
                })

                return {
                    ...community,
                    currentUserMembership: currentUserMembership || null
                }
            })
        )

        return NextResponse.json({
            communities: communitiesWithMembership,
            totalCount,
            hasMore: offset + limit < totalCount,
            page: Math.floor(offset / limit) + 1,
            totalPages: Math.ceil(totalCount / limit)
        })

    } catch (error) {
        console.error('Error searching communities:', error)
        return NextResponse.json(
            { error: 'Failed to search communities' },
            { status: 500 }
        )
    }
}
