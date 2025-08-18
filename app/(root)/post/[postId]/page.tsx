import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'
import PostDetailView from '@/components/post/PostDetailView'
import { transformPost } from '@/lib/utils'

export default async function PostDetailPage({ params }: { params: Promise<{ postId: string }> }) {
    const { postId } = await params
    const session = await getServerSession(authOptions)

    if (!session) {
        return <div className="text-center mt-8">Please sign in to view posts.</div>
    }

    const post = await prisma.post.findUnique({
        where: { id: postId },
        include: {
            author: {
                select: {
                    id: true,
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
                            id: true,
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
    })

    if (!post) {
        return <div className="text-center mt-8">Post not found.</div>
    }

    const transformedPost = transformPost(post)

    return <PostDetailView initialPost={transformedPost} session={session} />
}
