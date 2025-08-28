import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)

    if (!session) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const cursor = searchParams.get('cursor')
        const limit = parseInt(searchParams.get('limit') || '10')

        // Build where clause
        const whereClause: any = { 
            authorId: session.user.id
        }

        // Add cursor condition if provided
        if (cursor) {
            whereClause.id = { lt: cursor }
        }

        const posts = await prisma.post.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: limit + 1,
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        image: true,
                    },
                },
                reactions: true,
                parent: {
                    include: {
                        author: {
                            select: { 
                                id: true,
                                name: true, 
                                username: true,
                                image: true 
                            },
                        },
                    },
                },
                replies: {
                    include: {
                        author: {
                            select: { 
                                id: true,
                                name: true, 
                                username: true,
                                image: true 
                            },
                        },
                        reactions: true,
                        _count: {
                            select: { replies: true },
                        },
                    },
                },
                _count: {
                    select: { replies: true },
                },
            },
        })

        // Check if there are more results
        const hasMore = posts.length > limit
        const data = hasMore ? posts.slice(0, -1) : posts
        const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null

        const transformedPosts = data.map(post => ({
            ...post,
            createdAt: post.createdAt.toISOString(),
            mediaAttachments: post.mediaAttachments || [],
            reactions: post.reactions.map(r => ({
                ...r,
                createdAt: r.createdAt.toISOString()
            }))
        }))

        return NextResponse.json({ 
            posts: transformedPosts,
            nextCursor,
            hasMore
        })
    } catch (error) {
        console.error('Error fetching user posts:', error)
        return NextResponse.json(
            { error: 'Failed to fetch user posts' },
            { status: 500 }
        )
    }
}
