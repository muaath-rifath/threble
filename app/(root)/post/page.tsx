import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import prisma from '@/lib/prisma';
import UserPostList from '@/components/post/UserPostList';

const transformPost = (post: any) => ({
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
        author: post.parent.author
    } : null,
    replies: post.replies?.map((reply: any) => ({
        ...reply,
        createdAt: reply.createdAt.toISOString(),
        reactions: reply.reactions.map((r: any) => ({
            ...r,
            createdAt: r.createdAt.toISOString()
        }))
    })) || [],
    _count: post._count || { replies: 0 }
});

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
                    id: true,     // Add author id
                    name: true,
                    image: true,
                },
            },
            reactions: true,
            parent: {
                include: {
                    author: {
                        select: { 
                            id: true,    // Add parent author id
                            name: true, 
                            image: true 
                        },
                    },
                },
            },
            replies: {
                include: {
                    author: {
                        select: { 
                            id: true,    // Add reply author id
                            name: true, 
                            image: true 
                        },
                    },
                    reactions: true,
                    parent: {
                        include: {
                            author: {
                                select: { 
                                    id: true,    // Add nested parent author id
                                    name: true, 
                                    image: true 
                                },
                            },
                        },
                    },
                    replies: {
                        include: {
                            author: {
                                select: { 
                                    id: true,    // Add nested reply author id
                                    name: true, 
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
            },
            _count: {
                select: { replies: true },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    const transformedPosts = posts.map(transformPost);

    return (
        <div className="w-full max-w-4xl mx-auto">
            <UserPostList initialPosts={transformedPosts} session={session} />
        </div>
    );
}
