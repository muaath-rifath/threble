import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'
import FeedListContainer from '@/components/FeedListContainer'
import { transformPost } from '@/lib/utils'
import { Post } from '@/components/post/PostCard'

export default async function Home() {
    const session = await getServerSession(authOptions)

    if (!session) {
        return <div className="text-center mt-8">Please sign in to view and create posts.</div>
    }

    const posts = await prisma.post.findMany({
        where: {
            parentId: null, // Only top-level posts, no replies
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
        take: 10,
        include: {
            author: {
                select: { 
                    id: true,
                    name: true,
                    image: true 
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
                            image: true 
                        },
                    },
                },
            },
            replies: {
                include: {
                    author: {
                        select: { 
                            id: true,
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
        },
    })

    const transformedPosts = posts.map(post => transformPost(post)) as Post[]

    return (
        <div className="w-full max-w-4xl space-y-4">
            <FeedListContainer session={session} initialPosts={transformedPosts} />
        </div>
    )
}