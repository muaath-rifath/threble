import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'

// Mock AI moderation service - in production, this would integrate with actual AI services
interface ModerationResult {
    flagged: boolean
    categories: string[]
    confidence: number
    severity: 'low' | 'medium' | 'high'
    reasons?: string[]
}

async function moderateContent(content: string, type: 'post' | 'comment' | 'event' | 'community'): Promise<ModerationResult> {
    // Mock implementation - replace with actual AI service integration
    const suspiciousKeywords = [
        'spam', 'scam', 'hate', 'harassment', 'abuse', 'toxic',
        'violence', 'harmful', 'inappropriate', 'offensive'
    ]
    
    const lowerContent = content.toLowerCase()
    const foundKeywords = suspiciousKeywords.filter(keyword => lowerContent.includes(keyword))
    
    const flagged = foundKeywords.length > 0
    const confidence = Math.min(foundKeywords.length * 0.3, 1.0)
    
    let severity: 'low' | 'medium' | 'high' = 'low'
    if (confidence > 0.7) severity = 'high'
    else if (confidence > 0.4) severity = 'medium'
    
    return {
        flagged,
        categories: flagged ? ['potentially_harmful'] : [],
        confidence,
        severity,
        reasons: foundKeywords.length > 0 ? [`Contains suspicious keywords: ${foundKeywords.join(', ')}`] : undefined
    }
}

// POST - Moderate content
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { content, type, communityId, itemId } = body

        if (!content || !type) {
            return NextResponse.json(
                { error: 'Content and type are required' },
                { status: 400 }
            )
        }

        // Check if user has moderation permissions (for community-specific moderation)
        if (communityId) {
            const membership = await prisma.communityMember.findUnique({
                where: {
                    userId_communityId: {
                        userId: session.user.id,
                        communityId
                    }
                }
            })

            if (!membership || !['ADMIN', 'MODERATOR'].includes(membership.role)) {
                return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
            }
        }

        // Perform AI moderation
        const moderationResult = await moderateContent(content, type)

        // Store moderation result
        const moderationRecord = await prisma.moderationAction.create({
            data: {
                content,
                contentType: type.toUpperCase(),
                itemId: itemId || null,
                communityId: communityId || null,
                moderatorId: session.user.id,
                action: moderationResult.flagged ? 'FLAG' : 'APPROVE',
                reason: moderationResult.reasons?.join('; ') || 'AI moderation check',
                metadata: {
                    aiResult: {
                        flagged: moderationResult.flagged,
                        categories: moderationResult.categories,
                        confidence: moderationResult.confidence,
                        severity: moderationResult.severity,
                        reasons: moderationResult.reasons || []
                    },
                    timestamp: new Date().toISOString()
                } as any
            }
        })

        // If content is flagged with high severity, create notification for community admins
        if (moderationResult.flagged && moderationResult.severity === 'high' && communityId) {
            const admins = await prisma.communityMember.findMany({
                where: {
                    communityId,
                    role: 'ADMIN'
                },
                select: { userId: true }
            })

            if (admins.length > 0) {
                await prisma.notification.createMany({
                    data: admins.map(admin => ({
                        userId: admin.userId,
                        type: 'SYSTEM_ANNOUNCEMENT',
                        message: 'High-severity content has been flagged by AI moderation',
                        communityId,
                        data: {
                            moderationId: moderationRecord.id,
                            contentType: type,
                            severity: moderationResult.severity
                        }
                    }))
                })
            }
        }

        return NextResponse.json({
            success: true,
            moderation: {
                id: moderationRecord.id,
                flagged: moderationResult.flagged,
                severity: moderationResult.severity,
                confidence: moderationResult.confidence,
                categories: moderationResult.categories,
                action: moderationResult.flagged ? 'content_flagged' : 'content_approved'
            }
        })

    } catch (error) {
        console.error('Error in AI moderation:', error)
        return NextResponse.json(
            { error: 'Failed to moderate content' },
            { status: 500 }
        )
    }
}

// GET - Fetch moderation history
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const communityId = searchParams.get('communityId')
        const contentType = searchParams.get('contentType')
        const action = searchParams.get('action')
        const limit = parseInt(searchParams.get('limit') || '20')
        const offset = parseInt(searchParams.get('offset') || '0')

        // Check permissions
        if (communityId) {
            const membership = await prisma.communityMember.findUnique({
                where: {
                    userId_communityId: {
                        userId: session.user.id,
                        communityId
                    }
                }
            })

            if (!membership || !['ADMIN', 'MODERATOR'].includes(membership.role)) {
                return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
            }
        }

        const whereClause: any = {}
        if (communityId) whereClause.communityId = communityId
        if (contentType) whereClause.contentType = contentType.toUpperCase()
        if (action) whereClause.action = action.toUpperCase()

        const [moderationActions, totalCount] = await Promise.all([
            prisma.moderationAction.findMany({
                where: whereClause,
                include: {
                    moderator: {
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
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: limit,
                skip: offset
            }),
            prisma.moderationAction.count({ where: whereClause })
        ])

        return NextResponse.json({
            moderationActions,
            pagination: {
                total: totalCount,
                limit,
                offset,
                hasMore: offset + limit < totalCount
            }
        })

    } catch (error) {
        console.error('Error fetching moderation history:', error)
        return NextResponse.json(
            { error: 'Failed to fetch moderation history' },
            { status: 500 }
        )
    }
}
