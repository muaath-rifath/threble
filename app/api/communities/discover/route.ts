import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'

// GET - Discover communities (trending, suggested, new)
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        
        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const type = searchParams.get('type') || 'trending' // trending, suggested, new, popular
        const limit = parseInt(searchParams.get('limit') || '10')

        const userId = session.user.id
        const baseWhere = {
            visibility: 'PUBLIC' as const,
            // Exclude communities the user is already a member of
            members: {
                none: {
                    userId: userId
                }
            }
        }

        let communities: any[] = []

        switch (type) {
            case 'trending':
                // Communities with recent activity (posts in the last 7 days)
                const sevenDaysAgo = new Date()
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

                communities = await prisma.community.findMany({
                    where: {
                        ...baseWhere,
                        posts: {
                            some: {
                                createdAt: {
                                    gte: sevenDaysAgo
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
                                posts: {
                                    where: {
                                        createdAt: {
                                            gte: sevenDaysAgo
                                        }
                                    }
                                }
                            }
                        }
                    },
                    orderBy: [
                        { posts: { _count: 'desc' } },
                        { members: { _count: 'desc' } }
                    ],
                    take: limit
                })
                break

            case 'suggested':
                // Suggest communities based on user's interests (communities created by people they follow)
                communities = await prisma.community.findMany({
                    where: {
                        ...baseWhere,
                        OR: [
                            // Communities created by users the current user follows
                            {
                                creator: {
                                    followers: {
                                        some: {
                                            followerId: userId
                                        }
                                    }
                                }
                            },
                            // Communities with members the user follows
                            {
                                members: {
                                    some: {
                                        user: {
                                            followers: {
                                                some: {
                                                    followerId: userId
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        ]
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
                        { createdAt: 'desc' }
                    ],
                    take: limit
                })

                // If no suggested communities from follows, fall back to popular communities
                if (communities.length < limit) {
                    const additionalCommunities = await prisma.community.findMany({
                        where: {
                            ...baseWhere,
                            id: {
                                notIn: communities.map(c => c.id)
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
                            { members: { _count: 'desc' } },
                            { posts: { _count: 'desc' } }
                        ],
                        take: limit - communities.length
                    })
                    communities.push(...additionalCommunities)
                }
                break

            case 'new':
                // Recently created communities
                communities = await prisma.community.findMany({
                    where: baseWhere,
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
                    orderBy: { createdAt: 'desc' },
                    take: limit
                })
                break

            case 'popular':
                // Most popular communities by member count
                communities = await prisma.community.findMany({
                    where: baseWhere,
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
                    take: limit
                })
                break

            default:
                return NextResponse.json({ error: 'Invalid discovery type' }, { status: 400 })
        }

        return NextResponse.json({
            communities,
            type,
            count: communities.length
        })

    } catch (error) {
        console.error('Error discovering communities:', error)
        return NextResponse.json(
            { error: 'Failed to discover communities' },
            { status: 500 }
        )
    }
}
