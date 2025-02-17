import { Suspense } from 'react'
import { Session } from 'next-auth'
import PostDetail from './PostDetail'
import prisma from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { ExtendedPost } from '@/lib/types'

async function getPost(postId: string) {
    const post = await prisma.post.findUnique({
        where: { id: postId },
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
                    reactions: true,
                    _count: {
                        select: { replies: true },
                    },
                },
            },
            replies: {
                include: {
                    author: {
                        select: {
                            name: true,
                            image: true,
                        },
                    },
                    parent: {
                        select: {
                            id: true,
                            authorId: true,
                            author: {
                                select: { name: true, image: true },
                            },
                        },
                    },
                    reactions: true,
                    _count: {
                        select: { replies: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
            },
        },
    });

    if (!post) return null;

    // Transform the Prisma result to match ExtendedPost type
    const transformedPost: ExtendedPost = {
        ...post,
        createdAt: post.createdAt.toISOString(),
        mediaAttachments: post.mediaAttachments || [],
        reactions: post.reactions.map(r => ({
            ...r,
            createdAt: r.createdAt.toISOString()
        })),
        parent: post.parent ? {
            id: post.parent.id,
            authorId: post.parent.authorId,
            createdAt: post.parent.createdAt.toISOString(),
            author: {
                name: post.parent.author.name,
                image: post.parent.author.image
            }
        } : null,
        replies: (post.replies || []).map(reply => ({
            ...reply,
            createdAt: reply.createdAt.toISOString(),
            mediaAttachments: reply.mediaAttachments || [],
            reactions: reply.reactions.map(r => ({
                ...r,
                createdAt: r.createdAt.toISOString()
            })),
            author: {
                name: reply.author.name,
                image: reply.author.image
            },
            parent: null, // Since we don't need nested parent info in replies
            replies: [], // Initialize empty replies array for nested replies
            _count: { replies: reply._count?.replies || 0 }
        })),
        author: {
            name: post.author.name,
            image: post.author.image
        },
        _count: {
            replies: post._count?.replies || 0
        }
    };

    return transformedPost;
}