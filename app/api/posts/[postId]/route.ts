import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'
import { deleteFileFromBlobStorage, uploadFileToBlobStorage, moveFile } from '@/lib/azure-storage'

async function authorizeUser(postId: string, userId: string) {
    const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { authorId: true }
    });
    
    if (!post) {
        throw new Error('Post not found');
    }
    
    if (post.authorId !== userId) {
        throw new Error('Unauthorized');
    }
    
    return post;
}

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
            select: {
                id: true,
                content: true,
                createdAt: true,
                authorId: true,
                parentId: true,
                mediaAttachments: true,
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
                    select: {
                        id: true,
                        content: true,
                        createdAt: true,
                        authorId: true,
                        parentId: true,
                        mediaAttachments: true,
                        author: {
                            select: { name: true, image: true },
                        },
                        reactions: true,
                        _count: {
                            select: { replies: true },
                        },
                    },
                },
                replies: {
                    select: {
                        id: true,
                        content: true,
                        createdAt: true,
                        mediaAttachments: true,
                        author: {
                            select: { name: true, image: true },
                        },
                        reactions: true,
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

export async function DELETE(
    req: NextRequest,
    { params }: { params: { postId: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        // Authorize user
        try {
            await authorizeUser(params.postId, session.user.id);
        } catch (error: any) {
            return NextResponse.json({ error: error.message }, { status: error.message === 'Post not found' ? 404 : 403 });
        }

        // Get post media attachments
        const post = await prisma.post.findUnique({
            where: { id: params.postId },
            select: { mediaAttachments: true }
        });

        // Delete all media attachments from blob storage
        if (post?.mediaAttachments?.length) {
            await Promise.allSettled(
                post.mediaAttachments.map(url => deleteFileFromBlobStorage(url))
            ).then(results => {
                results.forEach((result, index) => {
                    if (result.status === 'rejected') {
                        console.error(`Failed to delete media ${index}:`, result.reason);
                    }
                });
            });
        }

        // Delete the post and all associated data
        await prisma.post.delete({
            where: { id: params.postId },
        });

        return NextResponse.json({ message: 'Post deleted successfully' });
    } catch (error) {
        console.error('Error deleting post:', error);
        return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: { postId: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        // Authorize user
        try {
            await authorizeUser(params.postId, session.user.id);
        } catch (error: any) {
            return NextResponse.json({ error: error.message }, { status: error.message === 'Post not found' ? 404 : 403 });
        }

        const formData = await req.formData();
        const content = formData.get('content') as string;
        const mediaFiles = formData.getAll('mediaAttachments') as File[];
        const keepMediaUrls = (formData.get('keepMediaUrls') as string || '').split(',').filter(Boolean);

        // Get existing post media
        const existingPost = await prisma.post.findUnique({
            where: { id: params.postId },
            select: { mediaAttachments: true }
        });

        let mediaAttachments = [...keepMediaUrls];

        // Delete media files that are not in keepMediaUrls
        if (existingPost?.mediaAttachments) {
            const toDelete = existingPost.mediaAttachments.filter(url => !keepMediaUrls.includes(url));
            await Promise.allSettled(toDelete.map(url => deleteFileFromBlobStorage(url)));
        }

        // Upload new media files
        if (mediaFiles.length > 0) {
            const newMediaUrls = await Promise.all(
                mediaFiles.map(file => uploadFileToBlobStorage(file, session.user.id))
            );

            // Move files to final location
            const finalUrls = await Promise.all(
                newMediaUrls.map(url => moveFile(url, session.user.id, params.postId))
            );

            mediaAttachments = [...mediaAttachments, ...finalUrls];
        }

        // Update the post
        const updatedPost = await prisma.post.update({
            where: { id: params.postId },
            data: {
                content,
                mediaAttachments
            },
            select: {
                id: true,
                content: true,
                createdAt: true,
                mediaAttachments: true,
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
                    select: {
                        author: {
                            select: { name: true, image: true },
                        },
                    },
                },
            },
        });

        return NextResponse.json(updatedPost);
    } catch (error) {
        console.error('Error updating post:', error);
        return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
    }
}