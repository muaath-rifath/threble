import { Suspense } from 'react'
import { Session } from 'next-auth'
import PostDetail from './PostDetail'
import prisma from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

async function getPost(postId: string) {
    return await prisma.post.findUnique({
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
                        include: {
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
}

export default async function PostDetailView({ 
    postId,
    session 
}: { 
    postId: string
    session: Session 
}) {
    const post = await getPost(postId)

    if (!post) {
        return (
            <div className="max-w-2xl mx-auto mt-8">
                <div className="p-6 text-center bg-white dark:bg-slate-900 rounded-lg shadow-sm">
                    <p className="text-lg font-medium">Post Not Found</p>
                </div>
            </div>
        )
    }

    return (
        <Suspense fallback={
            <div className="max-w-2xl mx-auto mt-8">
                <div className="p-6 bg-white dark:bg-slate-900 rounded-lg shadow-sm">
                    <div className="animate-pulse">
                        <div className="flex items-center space-x-4 mb-4">
                            <div className="h-12 w-12 bg-slate-200 dark:bg-slate-700 rounded-full" />
                            <div className="space-y-2">
                                <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                                <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded" />
                            <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
                        </div>
                    </div>
                </div>
            </div>
        }>
            <PostDetail initialPost={post} session={session} />
        </Suspense>
    )
}