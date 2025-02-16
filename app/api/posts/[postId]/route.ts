import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'

export async function GET(
    req: NextRequest,
    { params }: { params: { postId: string } }
) {
    const session = await getServerSession(authOptions)

    if (!session) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    try {
        const post = await prisma.post.findUnique({
            where: { id: params.postId },
            include: {
                author: {
                    select: {
                        name: true,
                        image: true,
                    },
                },
                reactions: true,
                _count: {
                    select: { replies: true },
                },
                parent: {
                    include: {
                        author: {
                            select: { name: true, image: true },
                        },
                    },
                },
                replies: {
                    include: {
                        author: {
                            select: { name: true, image: true },
                        },
                        parent: {
                            include: {
                                author: {
                                    select: { name: true, image: true },
                                },
                            },
                        },
                        _count: {
                            select: { replies: true },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        })

        if (!post) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 })
        }

        return NextResponse.json(post)
    } catch (error) {
        console.error('Error fetching post:', error)
        return NextResponse.json(
            { error: 'Failed to fetch post' },
            { status: 500 }
        )
    }
}