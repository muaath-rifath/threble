import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import PostDetail from '@/components/post/PostDetail'
import prisma from '@/lib/prisma'
import type { ExtendedPost } from '@/lib/types'

// Transform post from Prisma to ExtendedPost type
const transformPost = (post: any): ExtendedPost => ({
    ...post,
    createdAt: post.createdAt.toISOString(),
    mediaAttachments: post.mediaAttachments || [],
    reactions: post.reactions.map((r: any) => ({
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
    replies: (post.replies || []).map((reply: any) => ({
        ...reply,
        createdAt: reply.createdAt.toISOString(),
        mediaAttachments: reply.mediaAttachments || [],
        reactions: reply.reactions.map((r: any) => ({
            ...r,
            createdAt: r.createdAt.toISOString()
        })),
        author: {
            name: reply.author.name,
            image: reply.author.image
        },
        parent: null,
        replies: [],
        _count: { replies: reply._count?.replies || 0 }
    })),
    author: {
        name: post.author.name,
        image: post.author.image
    },
    _count: {
        replies: post._count?.replies || 0
    }
});

export default async function PostDetailPage({ params }: { params: { postId: string } }) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return <div className="text-center mt-8">Please sign in to view posts.</div>;
    }

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

    if (!post) {
        return <div className="text-center mt-8">Post not found.</div>;
    }

    const transformedPost = transformPost(post);

    return <PostDetail initialPost={transformedPost} session={session} />;
}
