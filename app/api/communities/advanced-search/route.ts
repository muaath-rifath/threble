import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'

// GET - Advanced community search with filters, tags, and recommendations
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const query = searchParams.get('q') || ''
        const category = searchParams.get('category') // Tech, Gaming, Art, etc.
        const minMembers = parseInt(searchParams.get('minMembers') || '0')
        const maxMembers = parseInt(searchParams.get('maxMembers') || '999999')
        const activityLevel = searchParams.get('activity') // low, medium, high
        const ageRange = searchParams.get('age') // new (< 30 days), recent (< 90 days), established (> 90 days)
        const sort = searchParams.get('sort') || 'relevant'
        const limit = parseInt(searchParams.get('limit') || '20')
        const offset = parseInt(searchParams.get('offset') || '0')
        const includePrivate = searchParams.get('includePrivate') === 'true'

        // Build complex where clause
        let whereClause: any = {
            visibility: includePrivate ? undefined : 'PUBLIC'
        }

        // Text search
        if (query.trim()) {
            whereClause.OR = [
                { name: { contains: query.trim(), mode: 'insensitive' } },
                { description: { contains: query.trim(), mode: 'insensitive' } }
            ]
        }

        // Member count filter
        whereClause.members = {
            ...(whereClause.members || {}),
            _count: {
                gte: minMembers,
                ...(maxMembers < 999999 && { lte: maxMembers })
            }
        }

        // Age filter
        if (ageRange) {
            const now = new Date()
            switch (ageRange) {
                case 'new':
                    whereClause.createdAt = { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
                    break
                case 'recent':
                    whereClause.createdAt = { gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) }
                    break
                case 'established':
                    whereClause.createdAt = { lt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) }
                    break
            }
        }

        // Activity level filter (based on posts in last 30 days)
        if (activityLevel) {
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

            let postCountFilter: any = {}
            switch (activityLevel) {
                case 'low':
                    postCountFilter = { lte: 5 }
                    break
                case 'medium':
                    postCountFilter = { gte: 6, lte: 50 }
                    break
                case 'high':
                    postCountFilter = { gte: 51 }
                    break
            }

            whereClause.posts = {
                ...(whereClause.posts || {}),
                some: {
                    createdAt: { gte: thirtyDaysAgo }
                }
            }

            // Note: We'll filter by activity level in a separate query for simplicity
        }

        // TODO: Category filter (would require adding categories to schema)
        // For now, we'll use description-based keyword matching
        if (category) {
            const categoryKeywords = {
                'tech': ['technology', 'programming', 'software', 'coding', 'development', 'tech'],
                'gaming': ['gaming', 'games', 'esports', 'streaming', 'twitch'],
                'art': ['art', 'design', 'creative', 'drawing', 'photography'],
                'music': ['music', 'band', 'concert', 'audio', 'sound'],
                'fitness': ['fitness', 'gym', 'workout', 'health', 'sport'],
                'food': ['food', 'cooking', 'recipe', 'restaurant', 'culinary'],
                'education': ['learning', 'education', 'study', 'university', 'course'],
                'business': ['business', 'startup', 'entrepreneur', 'marketing', 'finance']
            }

            const keywords = categoryKeywords[category.toLowerCase() as keyof typeof categoryKeywords]
            if (keywords) {
                whereClause.OR = [
                    ...(whereClause.OR || []),
                    ...keywords.map(keyword => ({
                        description: { contains: keyword, mode: 'insensitive' }
                    })),
                    ...keywords.map(keyword => ({
                        name: { contains: keyword, mode: 'insensitive' }
                    }))
                ]
            }
        }

        // Define sorting
        let orderBy: any = { createdAt: 'desc' }
        switch (sort) {
            case 'popular':
                orderBy = [
                    { members: { _count: 'desc' } },
                    { posts: { _count: 'desc' } }
                ]
                break
            case 'active':
                // Sort by recent post activity
                orderBy = [
                    { posts: { _count: 'desc' } },
                    { members: { _count: 'desc' } }
                ]
                break
            case 'newest':
                orderBy = { createdAt: 'desc' }
                break
            case 'oldest':
                orderBy = { createdAt: 'asc' }
                break
            case 'name':
                orderBy = { name: 'asc' }
                break
            case 'relevant':
            default:
                if (query.trim()) {
                    // For text search, prioritize name matches
                    orderBy = [
                        { name: 'asc' },
                        { members: { _count: 'desc' } }
                    ]
                } else {
                    orderBy = [
                        { members: { _count: 'desc' } },
                        { createdAt: 'desc' }
                    ]
                }
                break
        }

        // Execute search with pagination
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

        // Add current user's membership status
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

                // Calculate activity score for the last 30 days
                const thirtyDaysAgo = new Date()
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
                
                const recentActivity = await prisma.post.count({
                    where: {
                        communityId: community.id,
                        createdAt: { gte: thirtyDaysAgo }
                    }
                })

                return {
                    ...community,
                    currentUserMembership: currentUserMembership || null,
                    activityScore: recentActivity
                }
            })
        )

        return NextResponse.json({
            communities: communitiesWithMembership,
            pagination: {
                totalCount,
                hasMore: offset + limit < totalCount,
                currentPage: Math.floor(offset / limit) + 1,
                totalPages: Math.ceil(totalCount / limit)
            },
            filters: {
                query,
                category,
                minMembers,
                maxMembers,
                activityLevel,
                ageRange,
                sort,
                includePrivate
            }
        })

    } catch (error) {
        console.error('Error in advanced community search:', error)
        return NextResponse.json(
            { error: 'Failed to search communities' },
            { status: 500 }
        )
    }
}

// POST - Get personalized community recommendations
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const body = await req.json()
        const { interests, limit = 10 } = body

        const userId = session.user.id

        // Get user's current communities to exclude
        const userCommunities = await prisma.communityMember.findMany({
            where: { userId },
            select: { communityId: true }
        })

        const excludeIds = userCommunities.map(uc => uc.communityId)

        // Get communities from users they follow
        const followedUserCommunities = await prisma.community.findMany({
            where: {
                visibility: 'PUBLIC',
                id: { notIn: excludeIds },
                members: {
                    some: {
                        user: {
                            followers: {
                                some: { followerId: userId }
                            }
                        }
                    }
                }
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
            },
            take: Math.floor(limit / 2)
        })

        // Get communities based on interests (keyword matching)
        let interestBasedCommunities: any[] = []
        if (interests && interests.length > 0) {
            interestBasedCommunities = await prisma.community.findMany({
                where: {
                    visibility: 'PUBLIC',
                    id: { 
                        notIn: [
                            ...excludeIds, 
                            ...followedUserCommunities.map(c => c.id)
                        ] 
                    },
                    OR: interests.flatMap((interest: string) => [
                        { name: { contains: interest, mode: 'insensitive' } },
                        { description: { contains: interest, mode: 'insensitive' } }
                    ])
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
                },
                orderBy: [
                    { members: { _count: 'desc' } },
                    { posts: { _count: 'desc' } }
                ],
                take: limit - followedUserCommunities.length
            })
        }

        // Combine and add recommendation reasons
        const recommendations = [
            ...followedUserCommunities.map(community => ({
                ...community,
                recommendationReason: 'People you follow are in this community'
            })),
            ...interestBasedCommunities.map(community => ({
                ...community,
                recommendationReason: 'Matches your interests'
            }))
        ]

        // Fill remaining slots with trending communities if needed
        if (recommendations.length < limit) {
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

            const trendingCommunities = await prisma.community.findMany({
                where: {
                    visibility: 'PUBLIC',
                    id: { notIn: [...excludeIds, ...recommendations.map(r => r.id)] },
                    posts: {
                        some: {
                            createdAt: { gte: thirtyDaysAgo }
                        }
                    }
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
                },
                orderBy: [
                    { posts: { _count: 'desc' } },
                    { members: { _count: 'desc' } }
                ],
                take: limit - recommendations.length
            })

            recommendations.push(...trendingCommunities.map(community => ({
                ...community,
                recommendationReason: 'Trending in your area'
            })))
        }

        return NextResponse.json({
            recommendations: recommendations.slice(0, limit),
            totalFound: recommendations.length
        })

    } catch (error) {
        console.error('Error generating community recommendations:', error)
        return NextResponse.json(
            { error: 'Failed to generate recommendations' },
            { status: 500 }
        )
    }
}
