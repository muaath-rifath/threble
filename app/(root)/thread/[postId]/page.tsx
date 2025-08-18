import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'
import ThreadView from '@/components/post/ThreadView'
import { transformPost } from '@/lib/utils'

// Function to fetch nested replies recursively
async function fetchNestedReplies(postId: string, depth: number = 0): Promise<any[]> {
    if (depth > 10) return [] // Prevent infinite recursion
    
    const replies = await prisma.post.findMany({
        where: { parentId: postId },
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
        orderBy: { createdAt: 'asc' }, // Show replies chronologically like Twitter
    })

    // Fetch nested replies for each reply
    const repliesWithNested = await Promise.all(
        replies.map(async (reply) => {
            const nestedReplies = await fetchNestedReplies(reply.id, depth + 1)
            return {
                ...reply,
                replies: nestedReplies
            }
        })
    )

    return repliesWithNested
}

export default async function ThreadPage({ params }: { params: Promise<{ postId: string }> }) {
    const { postId } = await params
    const session = await getServerSession(authOptions)

    if (!session) {
        return <div className="text-center mt-8">Please sign in to view threads.</div>
    }

    // Fetch the main post
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

    // Fetch all nested replies
    const nestedReplies = await fetchNestedReplies(postId)
    
    const postWithReplies = {
        ...post,
        replies: nestedReplies
    }

    const transformedPost = transformPost(postWithReplies)

    return <ThreadView initialPost={transformedPost} session={session} />
}
