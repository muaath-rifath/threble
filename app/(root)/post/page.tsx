import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import prisma from '@/lib/prisma';
import UserPostList from '@/components/post/UserPostList';

export default async function UserPostPage() {
    const session = await getServerSession(authOptions);
    
    if (!session) {
        return <div className="text-center mt-8">Please sign in to view your posts.</div>;
    }

    const posts = await prisma.post.findMany({
        where: { authorId: session.user.id },
        include: {
            author: {
                select: {
                    name: true,
                    image: true,
                },
            },
            reactions: true,
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
                    reactions: true,
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
            },
            _count: {
                select: { replies: true },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    const transformPostToExtended = (post: any): any => ({
        ...post,
        createdAt: post.createdAt.toISOString(),
        reactions: post.reactions.map((r: any) => ({
            ...r,
            createdAt: r.createdAt.toISOString()
        })),
        parent: post.parent ? {
            id: post.parent.id,
            authorId: post.parent.authorId,
            createdAt: post.parent.createdAt.toISOString(),
            author: post.parent.author
        } : null,
        replies: post.replies?.map((reply: any) => transformPostToExtended(reply)) || [],
        _count: post._count || { replies: 0 }
    });

    const transformedPosts = posts.map(transformPostToExtended);

    return <UserPostList initialPosts={transformedPosts} />;
}
