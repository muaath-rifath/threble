'use client'

import { useState, useEffect } from 'react'
import { Session } from 'next-auth'
import { useInView } from 'react-intersection-observer'
import PostCard, { Post } from './post/PostCard'
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks'
import { fetchPosts, setInitialPosts } from '@/lib/redux/slices/postsSlice'

interface FeedListProps {
    session: Session
    initialPosts?: Post[]
}

export default function FeedList({ session, initialPosts = [] }: FeedListProps) {
    const dispatch = useAppDispatch()
    const { posts, loading, hasMore, cursor } = useAppSelector((state) => state.posts)
    const { ref, inView } = useInView()
    const [initialized, setInitialized] = useState(false)

    // Utility function to deep serialize post dates
    const serializePost = (post: any): any => {
        return {
            ...post,
            createdAt: typeof post.createdAt === 'string' ? post.createdAt : (post.createdAt as any)?.toISOString?.() || post.createdAt,
            updatedAt: typeof post.updatedAt === 'string' ? post.updatedAt : (post.updatedAt as any)?.toISOString?.() || post.updatedAt,
            reactions: post.reactions?.map((r: any) => ({
                ...r,
                createdAt: typeof r.createdAt === 'string' ? r.createdAt : (r.createdAt as any)?.toISOString?.() || r.createdAt
            })) || [],
            parent: post.parent ? serializePost(post.parent) : null,
            replies: post.replies?.map((reply: any) => serializePost(reply)) || []
        }
    }

    // Initialize Redux state with server-side posts
    useEffect(() => {
        if (initialPosts.length > 0 && !initialized) {
            const serializedPosts = initialPosts.map(serializePost)
            dispatch(setInitialPosts(serializedPosts))
            setInitialized(true)
        }
    }, [dispatch, initialPosts, initialized])

    // Load more posts when scrolling
    useEffect(() => {
        if (inView && hasMore && !loading && cursor) {
            dispatch(fetchPosts({ cursor }))
        }
    }, [inView, hasMore, loading, cursor, dispatch])

    // Use Redux posts if available, otherwise use initial posts
    const displayPosts = posts.length > 0 ? posts : initialPosts

    const handlePostUpdate = () => {
        // No longer needed - Redux handles updates automatically
    }

    if (!displayPosts.length && !loading) {
        return (
            <div className="text-center py-10">
                <p className="text-gray-500">No posts yet. Be the first to post!</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {displayPosts.map((post) => (
                <PostCard
                    key={post.id}
                    post={post}
                    session={session}
                    onUpdate={handlePostUpdate}
                />
            ))}
            {loading && (
                <div className="text-center py-4">
                    <p className="text-gray-500">Loading more posts...</p>
                </div>
            )}
            <div ref={ref} className="h-[10px]" />
        </div>
    )
}
