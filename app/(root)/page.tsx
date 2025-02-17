import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'
import FeedList from '@/components/FeedList'
import { transformPost } from '@/lib/utils'

export default async function Home() {
    const session = await getServerSession(authOptions)

    if (!session) {
        return <div className="text-center mt-8">Please sign in to view and create posts.</div>
    }

    const posts = await prisma.post.findMany({
        where: {
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

    const transformedPosts = posts.map(transformPost)

    return (
        <div className="w-full max-w-4xl">
            <FeedList initialPosts={transformedPosts} session={session} />
        </div>
    )
}