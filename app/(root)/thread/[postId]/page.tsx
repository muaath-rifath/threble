import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'
import ThreadView from '@/components/post/ThreadView'
import { transformPost } from '@/lib/utils'

export default async function ThreadPage({ params }: { params: Promise<{ postId: string }> }) {
    const { postId } = await params
    const session = await getServerSession(authOptions)

    if (!session) {
        return <div className="text-center mt-8">Please sign in to view threads.</div>
    }

    // Fetch only the main post without nested replies for performance
    const post = await prisma.post.findUnique({
        where: { id: postId },
        include: {
            author: {
                select: {
                    id: true,
                    name: true,
                    image: true,
                    username: true,
                },
            },
            reactions: true,
            _count: {
                select: { replies: true },
            },
            parent: {
                include: {
                    author: {
                        select: { 
                            id: true,
                            name: true, 
                            image: true,
                            username: true,
                        },
                    },
                    reactions: true,
                    _count: {
                        select: { replies: true },
                    },
                },
            },
        },
    })

    if (!post) {
        return <div className="text-center mt-8">Thread not found.</div>
    }

    // Add empty replies array to match expected interface
    const postWithEmptyReplies = {
        ...post,
        replies: [] // Will be loaded via pagination
    }

    const transformedPost = transformPost(postWithEmptyReplies)

    return <ThreadView initialPost={transformedPost} session={session} />
}
