import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'
import FeedList from '@/components/FeedList'
import PostForm from '@/components/PostForm'
import { transformPost } from '@/lib/utils'
import { Post } from '@/lib/types'

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

    const transformedPosts = posts.map(post => transformPost(post)) as Post[]

    return (
        <div className="w-full max-w-4xl space-y-4">
            <PostForm />
            <FeedList session={session} initialPosts={transformedPosts} />
        </div>
    )
}