import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'
import { uploadFileToBlobStorage, moveFile, getStorageClients } from '@/lib/azure-storage'

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
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await req.formData();
        const content = formData.get('content') as string;
        const visibility = formData.get('visibility') as string;
        const parentId = formData.get('parentId') as string | null;
        const communityId = formData.get('communityId') as string | null;
        const mediaFiles = formData.getAll('mediaAttachments') as File[];
        let mediaAttachments: string[] = [];

        // First upload files to temporary location
        if (mediaFiles.length > 0) {
            mediaAttachments = await Promise.all(
                mediaFiles.map(file => uploadFileToBlobStorage(file, session.user.id))
            );
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
        });

        // Move files from temp location to final location under the post ID
        if (mediaAttachments.length > 0) {
            try {
                const updatedAttachments = await Promise.all(
                    mediaAttachments.map(url => 
                        moveFile(url, session.user.id, newPost.id)
                    )
                );

                // Update the post with new media URLs
                await prisma.post.update({
                    where: { id: newPost.id },
                    data: { mediaAttachments: updatedAttachments }
                });

                // Update the returned post object
                newPost.mediaAttachments = updatedAttachments;
            } catch (error) {
                console.error('Error moving media files:', error);
                // Continue with the original URLs if move fails
            }
        }

        return NextResponse.json(newPost, { status: 201 });
    } catch (error) {
        console.error('Error creating post:', error);
        return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
    }
}