import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'
import { uploadFileToBlobStorage } from '@/lib/azure-storage'

// Handle GET requests
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)

    if (!session) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const cursor = searchParams.get('cursor')

    try {
        const posts = await prisma.post.findMany({
            where: {
                OR: [
                    { authorId: session.user.id },
                    {
                        author: {
                            followers: {
                                some: { followerId: session.user.id },
                            },
                        },
                    },
                    { visibility: 'public' },
                ],
            },
            orderBy: { createdAt: 'desc' },
            include: {
                author: {
                    select: { name: true, image: true },
                },
                reactions: true,
                _count: {
                    select: { replies: true },
                },
                parent: {
                    include: {
                        author: {
                            select: { name: true, image: true },
                        }
                    }
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
                                }
                            }
                        },
                        reactions: true,
                        _count: {
                            select: { replies: true },
                        }
                    }
                }
            },
            take: limit + 1,
            cursor: cursor ? { id: cursor } : undefined,
            skip: cursor ? 1 : 0,
        })

        let nextCursor = null
        if (posts.length > limit) {
            const nextItem = posts.pop()
            nextCursor = nextItem?.id || null
        }

        return NextResponse.json({ posts, nextCursor })
    } catch (error) {
        console.error('Error fetching posts:', error)
        return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
    }
}

// Handle POST requests
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)

    if (!session) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    try {
        const formData = await req.formData()
        const content = formData.get('content') as string
        const visibility = formData.get('visibility') as string
        const parentId = formData.get('parentId') as string | null
        const communityId = formData.get('communityId') as string | null
        const mediaFiles = formData.getAll('mediaAttachments') as File[]
        const mediaAttachments: string[] = []

        // Handle media uploads if any
        if (mediaFiles.length > 0) {
            for (const file of mediaFiles) {
                const imageUrl = await uploadFileToBlobStorage(file)
                mediaAttachments.push(imageUrl)
            }
        }

        // Create the post/reply
        const newPost = await prisma.post.create({
            data: {
                content,
                authorId: session.user.id,
                visibility,
                parentId,
                communityId,
                mediaAttachments
            },
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
                        }
                    }
                }
            },
        })

        return NextResponse.json(newPost, { status: 201 })
    } catch (error) {
        console.error('Error creating post:', error)
        return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
    }
}