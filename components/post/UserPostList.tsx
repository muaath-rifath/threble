'use client'

import { useState, useEffect, useCallback } from 'react'
import { Session } from 'next-auth'
import { useInView } from '@intersection-observer/next'
import PostCard, { Post } from '@/components/post/PostCard'
import { Loader2 } from 'lucide-react'

interface UserPostListProps {
    session: Session
    initialPosts?: Post[]
}

export default function UserPostList({ session, initialPosts = [] }: UserPostListProps) {
    const [posts, setPosts] = useState<Post[]>(initialPosts)
    const [loading, setLoading] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    const [cursor, setCursor] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Intersection observer for infinite scroll
    const { ref, inView } = useInView({
        threshold: 0
    })

    const fetchPosts = useCallback(async (isLoadMore = false) => {
        try {
            if (!isLoadMore) {
                setLoading(true)
                setError(null)
            } else {
                setLoadingMore(true)
            }

            const params = new URLSearchParams({
                limit: '10',
                ...(isLoadMore && cursor && { cursor })
            })

            const response = await fetch(`/api/posts/user?${params}`)
            if (!response.ok) throw new Error('Failed to fetch posts')
            
            const result = await response.json()
            
            if (!isLoadMore) {
                setPosts(result.posts)
            } else {
                setPosts(prev => [...prev, ...result.posts])
            }
            
            setCursor(result.nextCursor)
            setHasMore(result.hasMore)
        } catch (error) {
            console.error('Error fetching posts:', error)
            setError('Failed to load posts')
        } finally {
            setLoading(false)
            setLoadingMore(false)
        }
    }, [cursor])

    // Initial load if no initial posts provided
    useEffect(() => {
        if (initialPosts.length === 0) {
            fetchPosts()
        }
    }, [])

    // Infinite scroll effect
    useEffect(() => {
        if (inView && hasMore && !loading && !loadingMore) {
            fetchPosts(true)
        }
    }, [inView, hasMore, loading, loadingMore, fetchPosts])

    const handlePostUpdate = async () => {
        // Refresh posts after update
        setCursor(null)
        setHasMore(true)
        await fetchPosts(false)
    }

    if (error) {
        return (
            <div className="text-center py-8">
                <p className="text-destructive mb-4">{error}</p>
                <button 
                    onClick={() => fetchPosts()} 
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
                >
                    Try Again
                </button>
            </div>
        )
    }

    if (loading && posts.length === 0) {
        return (
            <div className="space-y-6">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                        <div className="bg-muted rounded-lg p-6">
                            <div className="flex items-center space-x-4 mb-4">
                                <div className="w-10 h-10 bg-muted-foreground/20 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-muted-foreground/20 rounded w-1/4" />
                                    <div className="h-3 bg-muted-foreground/20 rounded w-1/6" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="h-4 bg-muted-foreground/20 rounded" />
                                <div className="h-4 bg-muted-foreground/20 rounded w-3/4" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {posts.map((post) => (
                <PostCard
                    key={post.id}
                    post={post}
                    session={session}
                    onUpdate={handlePostUpdate}
                    showFullContent={true}
                />
            ))}

            {/* Infinite scroll trigger */}
            {hasMore && (
                <div ref={ref as any} className="py-4">
                    {loadingMore && (
                        <div className="flex justify-center">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Loading more posts...
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Empty state */}
            {posts.length === 0 && !loading && (
                <div className="text-center py-12 text-muted-foreground">
                    <p>No posts found.</p>
                </div>
            )}
        </div>
    )
}