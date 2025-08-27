import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ communityId: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const { communityId } = await params

        // Check if user is admin or moderator
        const membership = await prisma.communityMember.findUnique({
            where: {
                userId_communityId: {
                    userId: session.user.id,
                    communityId
                }
            }
        })

        if (!membership || !['ADMIN', 'MODERATOR'].includes(membership.role)) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
        }

        const { searchParams } = new URL(req.url)
        const period = searchParams.get('period') || '7d' // 24h, 7d, 30d, all

        let dateFilter: { gte?: Date } = {}
        const now = new Date()

        switch (period) {
            case '24h':
                dateFilter = { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
                break
            case '7d':
                dateFilter = { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
                break
            case '30d':
                dateFilter = { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
                break
            case 'all':
            default:
                // No date filter
                break
        }

        const whereClause = dateFilter.gte ? { createdAt: dateFilter } : {}

        // Get comprehensive moderation data
        const [
            community,
            memberStats,
            postStats,
            recentActivity,
            pendingRequests,
            pendingInvitations,
            flaggedContent,
            memberActivity
        ] = await Promise.all([
            // Basic community info
            prisma.community.findUnique({
                where: { id: communityId },
                select: {
                    name: true,
                    visibility: true,
                    createdAt: true,
                    creator: {
                        select: {
                            name: true,
                            username: true
                        }
                    }
                }
            }),

            // Member statistics
            prisma.communityMember.aggregate({
                where: { 
                    communityId,
                    ...(dateFilter.gte && { joinedAt: dateFilter })
                },
                _count: {
                    id: true
                }
            }),

            // Post statistics
            prisma.post.aggregate({
                where: { 
                    communityId,
                    ...whereClause
                },
                _count: {
                    id: true
                }
            }),

            // Recent activity (posts, joins, etc.)
            prisma.post.findMany({
                where: { 
                    communityId,
                    ...whereClause
                },
                include: {
                    author: {
                        select: {
                            id: true,
                            name: true,
                            username: true,
                            image: true
                        }
                    },
                    _count: {
                        select: {
                            reactions: true,
                            replies: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: 10
            }),

            // Pending join requests
            prisma.joinRequest.findMany({
                where: { 
                    communityId, 
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
                },
                orderBy: { createdAt: 'desc' },
                take: 10
            }),

            // Pending invitations
            prisma.communityInvitation.findMany({
                where: { 
                    communityId, 
                    status: 'PENDING' 
                },
                include: {
                    invitee: {
                        select: {
                            name: true,
                            username: true,
                            image: true
                        }
                    },
                    inviter: {
                        select: {
                            name: true,
                            username: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: 10
            }),

            // TODO: Flagged content (would need reporting system)
            // For now, we'll get posts with high activity that might need attention
            prisma.post.findMany({
                where: { 
                    communityId,
                    ...whereClause
                },
                include: {
                    author: {
                        select: {
                            name: true,
                            username: true
                        }
                    },
                    _count: {
                        select: {
                            reactions: true,
                            replies: true
                        }
                    }
                },
                orderBy: [
                    { reactions: { _count: 'desc' } },
                    { replies: { _count: 'desc' } }
                ],
                take: 5
            }),

            // Most active members in the period
            prisma.post.groupBy({
                by: ['authorId'],
                where: { 
                    communityId,
                    ...whereClause
                },
                _count: {
                    id: true
                },
                orderBy: {
                    _count: {
                        id: 'desc'
                    }
                },
                take: 10
            })
        ])

        // Get user details for most active members
        const activeUserIds = memberActivity.map(m => m.authorId)
        const activeUsers = activeUserIds.length > 0 ? await prisma.user.findMany({
            where: { id: { in: activeUserIds } },
            select: {
                id: true,
                name: true,
                username: true,
                image: true
            }
        }) : []

        const activeMembersWithDetails = memberActivity.map(activity => {
            const user = activeUsers.find(u => u.id === activity.authorId)
            return {
                user,
                postCount: activity._count.id
            }
        })

        // Calculate growth metrics
        const previousPeriodStart = dateFilter.gte ? new Date(dateFilter.gte.getTime() - (now.getTime() - dateFilter.gte.getTime())) : null
        
        let growthMetrics = null
        if (previousPeriodStart) {
            const [prevMemberCount, prevPostCount] = await Promise.all([
                prisma.communityMember.count({
                    where: { 
                        communityId,
                        joinedAt: {
                            gte: previousPeriodStart,
                            lt: dateFilter.gte
                        }
                    }
                }),
                prisma.post.count({
                    where: { 
                        communityId,
                        createdAt: {
                            gte: previousPeriodStart,
                            lt: dateFilter.gte
                        }
                    }
                })
            ])

            growthMetrics = {
                memberGrowth: prevMemberCount > 0 ? 
                    ((memberStats._count.id - prevMemberCount) / prevMemberCount * 100).toFixed(1) : 
                    memberStats._count.id > 0 ? '100' : '0',
                postGrowth: prevPostCount > 0 ? 
                    ((postStats._count.id - prevPostCount) / prevPostCount * 100).toFixed(1) : 
                    postStats._count.id > 0 ? '100' : '0'
            }
        }

        return NextResponse.json({
            community,
            period,
            stats: {
                members: {
                    new: memberStats._count.id,
                    growth: growthMetrics?.memberGrowth || null
                },
                posts: {
                    new: postStats._count.id,
                    growth: growthMetrics?.postGrowth || null
                },
                pendingRequests: pendingRequests.length,
                pendingInvitations: pendingInvitations.length
            },
            recentActivity,
            pendingRequests,
            pendingInvitations,
            highActivityPosts: flaggedContent,
            activeMembers: activeMembersWithDetails
        })

    } catch (error) {
        console.error('Error fetching moderation dashboard:', error)
        return NextResponse.json(
            { error: 'Failed to fetch moderation data' },
            { status: 500 }
        )
    }
}

// POST - Perform moderation actions
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ communityId: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const { communityId } = await params
        const body = await req.json()
        const { action, targetType, targetId, reason } = body

        // Check permissions
        const membership = await prisma.communityMember.findUnique({
            where: {
                userId_communityId: {
                    userId: session.user.id,
                    communityId
                }
            }
        })

        if (!membership || !['ADMIN', 'MODERATOR'].includes(membership.role)) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
        }

        let result = null

        switch (action) {
            case 'delete_post':
                if (targetType === 'post') {
                    // Verify post belongs to community
                    const post = await prisma.post.findFirst({
                        where: { id: targetId, communityId }
                    })
                    
                    if (!post) {
                        return NextResponse.json({ error: 'Post not found' }, { status: 404 })
                    }

                    result = await prisma.post.delete({
                        where: { id: targetId }
                    })

                    // TODO: Log moderation action
                    // await logModerationAction(session.user.id, communityId, 'delete_post', targetId, reason)
                }
                break

            case 'remove_member':
                if (targetType === 'member' && membership.role === 'ADMIN') {
                    // Only admins can remove members
                    const targetMember = await prisma.communityMember.findUnique({
                        where: { id: targetId },
                        include: { community: true }
                    })

                    if (!targetMember || targetMember.communityId !== communityId) {
                        return NextResponse.json({ error: 'Member not found' }, { status: 404 })
                    }

                    // Can't remove other admins or yourself
                    if (targetMember.role === 'ADMIN' || targetMember.userId === session.user.id) {
                        return NextResponse.json({ error: 'Cannot remove admin or yourself' }, { status: 400 })
                    }

                    result = await prisma.communityMember.delete({
                        where: { id: targetId }
                    })

                    // TODO: Log moderation action
                }
                break

            case 'ban_user':
                // TODO: Implement user banning system
                // This would require a banned users table
                break

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
        }

        return NextResponse.json({
            success: true,
            action,
            targetType,
            targetId,
            result
        })

    } catch (error) {
        console.error('Error performing moderation action:', error)
        return NextResponse.json(
            { error: 'Failed to perform moderation action' },
            { status: 500 }
        )
    }
}
