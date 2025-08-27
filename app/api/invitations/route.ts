import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'

// GET - Get user's received invitations
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const status = searchParams.get('status') as 'PENDING' | 'ACCEPTED' | 'REJECTED' | null
        const limit = parseInt(searchParams.get('limit') || '20')
        const cursor = searchParams.get('cursor')

        let whereClause: any = { inviteeId: session.user.id }

        if (status) {
            whereClause.status = status
        } else {
            // Default to pending invitations
            whereClause.status = 'PENDING'
        }

        let cursorClause = {}
        if (cursor) {
            cursorClause = {
                cursor: { id: cursor },
                skip: 1
            }
        }

        const invitations = await prisma.communityInvitation.findMany({
            where: whereClause,
            include: {
                community: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        image: true,
                        visibility: true,
                        _count: {
                            select: {
                                members: true
                            }
                        }
                    }
                },
                inviter: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        image: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: limit + 1,
            ...cursorClause
        })

        const hasNextPage = invitations.length > limit
        const nextCursor = hasNextPage ? invitations[limit - 1].id : null

        if (hasNextPage) {
            invitations.pop()
        }

        return NextResponse.json({
            invitations,
            nextCursor,
            hasNextPage
        })

    } catch (error) {
        console.error('Error fetching user invitations:', error)
        return NextResponse.json(
            { error: 'Failed to fetch invitations' },
            { status: 500 }
        )
    }
}
