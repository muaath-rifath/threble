'use client'

import { useState, useEffect } from 'react'
import { Session } from 'next-auth'
import { useInView } from 'react-intersection-observer'
import PostCard from './post/PostCard'

interface Post {
    id: string
    content: string
    author: {
        id: string
        name: string | null
        image: string | null
    }
    createdAt: string
    reactions: Array<{
        id: string
        type: string
        userId: string
    }>
    _count: {
        replies: number
    }
    mediaAttachments?: string[]
}

interface FeedListProps {
    session: Session
    initialPosts?: Post[]
}

export default function FeedList({ session, initialPosts = [] }: FeedListProps) {
    const [posts, setPosts] = useState<Post[]>(initialPosts)
    const [nextCursor, setNextCursor] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const { ref, inView } = useInView()

    const fetchPosts = async (cursor?: string | null) => {
        try {
            setIsLoading(true)
            const url = `/api/posts${cursor ? `?cursor=${cursor}` : ''}`
            const response = await fetch(url)
            
            if (!response.ok) {
                throw new Error('Failed to fetch posts')
            }
            
            const data = await response.json()
            
            if (cursor) {
                setPosts(prev => [...prev, ...data.posts])
            } else {
                setPosts(data.posts)
            }
            
            setNextCursor(data.nextCursor)
        } catch (error) {
            console.error('Error fetching posts:', error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        // Initial load if no posts provided
        if (initialPosts.length === 0) {
            fetchPosts()
        }
    }, [initialPosts.length])

    useEffect(() => {
        // Load more posts when scrolling to bottom
        if (inView && nextCursor && !isLoading) {
            fetchPosts(nextCursor)
        }
    }, [inView, nextCursor, isLoading])

    const handlePostUpdate = () => {
        // Fetch fresh data from the beginning
        fetchPosts()
    }

    if (!posts.length && !isLoading) {
        return (
            <div className="text-center py-10">
                <p className="text-gray-500">No posts yet. Be the first to post!</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {posts.map((post) => (
                <PostCard
                    key={post.id}
                    post={post}
                    session={session}
                    onUpdate={handlePostUpdate}
                />
            ))}
            {isLoading && (
                <div className="text-center py-4">
                    <p className="text-gray-500">Loading more posts...</p>
                </div>
            )}
            <div ref={ref} className="h-[10px]" />
        </div>
    )
}
