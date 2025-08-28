import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'
import { deleteFileFromBlobStorage, uploadFileToBlobStorage, moveFile } from '@/lib/azure-storage'

async function authorizeUser(postId: string, userId: string, action: 'read' | 'edit' | 'delete' = 'edit') {
    const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { 
            authorId: true,
            communityId: true,
            community: {
                select: {
                    id: true,
                    name: true,
                    visibility: true
                }
            }
        }
    });
    
    if (!post) {
        throw new Error('Post not found');
    }

    // For read access, check community visibility
    if (action === 'read') {
        if (post.communityId && post.community) {
            // For private communities, user must be a member
            if (post.community.visibility === 'PRIVATE') {
                const membership = await prisma.communityMember.findUnique({
                    where: {
                        userId_communityId: {
                            userId: userId,
                            communityId: post.communityId
                        }
                    }
                });

                if (!membership) {
                    throw new Error('Access denied to private community post');
                }
            }
        }
        return post;
    }

    // For edit/delete actions
    const isAuthor = post.authorId === userId;

    // If user is the author, they can edit/delete
    if (isAuthor) {
        return post;
    }

    // For community posts, check if user is admin/moderator
    if (post.communityId && action === 'delete') {
        const membership = await prisma.communityMember.findUnique({
            where: {
                userId_communityId: {
                    userId: userId,
                    communityId: post.communityId
                }
            }
        });

        // Only admins and moderators can delete others' posts
        if (membership && (membership.role === 'ADMIN' || membership.role === 'MODERATOR')) {
            return post;
        }
    }
    
    throw new Error('Unauthorized');
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ postId: string }> }
) {
    const { postId } = await params
    const session = await getServerSession(authOptions)

    if (!session) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    try {
        // Check read authorization first
        try {
            await authorizeUser(postId, session.user.id, 'read');
        } catch (error: any) {
            return NextResponse.json({ error: error.message }, { status: error.message === 'Post not found' ? 404 : 403 });
        }

        const post = await prisma.post.findUnique({
            where: { id: postId },
            select: {
                id: true,
                content: true,
                createdAt: true,
                updatedAt: true,
                authorId: true,
                parentId: true,
                communityId: true,
                mediaAttachments: true,
                author: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        image: true,
                    },
                },
                community: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                        visibility: true
                    }
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
                        updatedAt: true,
                        authorId: true,
                        parentId: true,
                        communityId: true,
                        mediaAttachments: true,
                        author: {
                            select: { 
                                id: true,
                                name: true, 
                                username: true,
                                image: true 
                            },
                        },
                        community: {
                            select: {
                                id: true,
                                name: true,
                                image: true
                            }
                        },
                        reactions: true,
                        _count: {
                            select: { replies: true },
                        },
                    },
                },
                // Don't include replies here - they'll be loaded via pagination
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
    { params }: { params: Promise<{ postId: string }> }
) {
    try {
        const { postId } = await params
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        // Authorize user for deletion (supports community moderation)
        try {
            await authorizeUser(postId, session.user.id, 'delete');
        } catch (error: any) {
            return NextResponse.json({ error: error.message }, { status: error.message === 'Post not found' ? 404 : 403 });
        }

        // Get post media attachments
        const post = await prisma.post.findUnique({
            where: { id: postId },
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
            where: { id: postId },
        });

        return NextResponse.json({ message: 'Post deleted successfully' });
    } catch (error) {
        console.error('Error deleting post:', error);
        return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ postId: string }> }
) {
    try {
        const { postId } = await params
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        // Authorize user for editing (only author can edit)
        try {
            await authorizeUser(postId, session.user.id, 'edit');
        } catch (error: any) {
            return NextResponse.json({ error: error.message }, { status: error.message === 'Post not found' ? 404 : 403 });
        }

        const formData = await req.formData();
        const content = formData.get('content') as string;
        const mediaFiles = formData.getAll('mediaAttachments') as File[];
        const keepMediaUrls = (formData.get('keepMediaUrls') as string || '').split(',').filter(Boolean);

        // Get existing post media
        const existingPost = await prisma.post.findUnique({
            where: { id: postId },
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
                newMediaUrls.map(url => moveFile(url, session.user.id, postId))
            );

            mediaAttachments = [...mediaAttachments, ...finalUrls];
        }

        // Update the post
        const updatedPost = await prisma.post.update({
            where: { id: postId },
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