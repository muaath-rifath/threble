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
        const days = parseInt(searchParams.get('days') || '30')
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)

        // Get comprehensive analytics data
        const [
            communityInfo,
            memberGrowth,
            postActivity,
            engagementMetrics,
            topContributors,
            memberDistribution,
            activityByDay,
            joinRequestStats
        ] = await Promise.all([
            // Basic community information
            prisma.community.findUnique({
                where: { id: communityId },
                include: {
                    _count: {
                        select: {
                            members: true,
                            posts: true,
                            joinRequests: true,
                            invitations: true
                        }
                    }
                }
            }),

            // Member growth over time
            prisma.$queryRaw`
                SELECT 
                    DATE(joined_at) as date,
                    COUNT(*) as new_members,
                    SUM(COUNT(*)) OVER (ORDER BY DATE(joined_at)) as total_members
                FROM "CommunityMember" 
                WHERE community_id = ${communityId} 
                    AND joined_at >= ${startDate}
                GROUP BY DATE(joined_at)
                ORDER BY date
            `,

            // Post activity over time
            prisma.$queryRaw`
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as posts_count
                FROM "Post" 
                WHERE community_id = ${communityId} 
                    AND created_at >= ${startDate}
                GROUP BY DATE(created_at)
                ORDER BY date
            `,

            // Engagement metrics (reactions per post, replies per post)
            prisma.post.aggregate({
                where: { 
                    communityId,
                    createdAt: { gte: startDate }
                },
                _count: { id: true }
            }),

            // Top contributors by post count and engagement
            prisma.$queryRaw`
                SELECT 
                    u.id,
                    u.name,
                    u.username,
                    u.image,
                    COUNT(p.id) as post_count,
                    COUNT(DISTINCT r.id) as total_reactions
                FROM "User" u
                JOIN "CommunityMember" cm ON u.id = cm.user_id
                LEFT JOIN "Post" p ON u.id = p.author_id AND p.community_id = ${communityId}
                LEFT JOIN "Reaction" r ON p.id = r.post_id
                WHERE cm.community_id = ${communityId}
                    AND (p.created_at >= ${startDate} OR p.created_at IS NULL)
                GROUP BY u.id, u.name, u.username, u.image
                ORDER BY post_count DESC, total_reactions DESC
                LIMIT 10
            `,

            // Member role distribution
            prisma.communityMember.groupBy({
                by: ['role'],
                where: { communityId },
                _count: { id: true }
            }),

            // Activity by day of week
            prisma.$queryRaw`
                SELECT 
                    EXTRACT(DOW FROM created_at) as day_of_week,
                    COUNT(*) as activity_count
                FROM "Post" 
                WHERE community_id = ${communityId}
                    AND created_at >= ${startDate}
                GROUP BY EXTRACT(DOW FROM created_at)
                ORDER BY day_of_week
            `,

            // Join request statistics
            prisma.joinRequest.groupBy({
                by: ['status'],
                where: { 
                    communityId,
                    createdAt: { gte: startDate }
                },
                _count: { id: true }
            })
        ])

        // Calculate engagement rate (reactions + replies per post)
        const totalPosts = engagementMetrics._count.id
        let engagementRate = 0

        if (totalPosts > 0) {
            const reactionCount = await prisma.reaction.count({
                where: {
                    post: {
                        communityId,
                        createdAt: { gte: startDate }
                    }
                }
            })

            const replyCount = await prisma.post.count({
                where: {
                    communityId,
                    parentId: { not: null },
                    createdAt: { gte: startDate }
                }
            })

            engagementRate = ((reactionCount + replyCount) / totalPosts)
        }

        // Format activity by day of week
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        const formattedActivityByDay = (activityByDay as any[]).map((day: any) => ({
            day: dayNames[parseInt(day.day_of_week)],
            activity: parseInt(day.activity_count)
        }))

        // Calculate retention rate (members who posted in the period)
        const activeMemberCount = await prisma.communityMember.count({
            where: {
                communityId,
                user: {
                    posts: {
                        some: {
                            communityId,
                            createdAt: { gte: startDate }
                        }
                    }
                }
            }
        })

        const retentionRate = communityInfo?._count.members ? 
            (activeMemberCount / communityInfo._count.members * 100).toFixed(1) : '0'

        // Format member role distribution
        const roleDistribution = memberDistribution.map(dist => ({
            role: dist.role,
            count: dist._count.id,
            percentage: communityInfo?._count.members ? 
                (dist._count.id / communityInfo._count.members * 100).toFixed(1) : '0'
        }))

        return NextResponse.json({
            communityInfo: {
                name: communityInfo?.name,
                visibility: communityInfo?.visibility,
                totalMembers: communityInfo?._count.members || 0,
                totalPosts: communityInfo?._count.posts || 0,
                totalJoinRequests: communityInfo?._count.joinRequests || 0,
                totalInvitations: communityInfo?._count.invitations || 0
            },
            period: {
                days,
                startDate: startDate.toISOString(),
                endDate: new Date().toISOString()
            },
            growth: {
                memberGrowth: memberGrowth,
                postActivity: postActivity
            },
            engagement: {
                totalPosts,
                engagementRate: engagementRate.toFixed(2),
                retentionRate: `${retentionRate}%`,
                activeMemberCount
            },
            topContributors: topContributors,
            distribution: {
                roles: roleDistribution,
                activityByDay: formattedActivityByDay
            },
            requests: {
                joinRequests: joinRequestStats
            }
        })

    } catch (error) {
        console.error('Error fetching community analytics:', error)
        return NextResponse.json(
            { error: 'Failed to fetch analytics' },
            { status: 500 }
        )
    }
}
