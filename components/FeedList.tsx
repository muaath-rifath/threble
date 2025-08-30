'use client'

import { useState, useEffect } from 'react'
import { Session } from 'next-auth'
import { useInView } from '@intersection-observer/next'
import PostCard, { Post } from './post/PostCard'

// Optional Redux integration
let useAppDispatch: any, useAppSelector: any, fetchPosts: any, setInitialPosts: any, initializeBookmarkStatus: any
try {
  const reduxHooks = require('@/lib/redux/hooks')
  const postsSlice = require('@/lib/redux/slices/postsSlice')
  const bookmarksSlice = require('@/lib/redux/slices/bookmarksSlice')
  
  useAppDispatch = reduxHooks.useAppDispatch
  useAppSelector = reduxHooks.useAppSelector
  fetchPosts = postsSlice.fetchPosts
  setInitialPosts = postsSlice.setInitialPosts
  initializeBookmarkStatus = bookmarksSlice.initializeBookmarkStatus
} catch (error) {
  console.log('Redux not available for FeedList, using fallback mode')
}

interface FeedListProps {
    session: Session
    initialPosts?: Post[]
}

export default function FeedList({ session, initialPosts = [] }: FeedListProps) {
    const dispatch = useAppDispatch?.()
    const reduxState = useAppSelector ? useAppSelector((state: any) => state.posts) : null
    const { posts: reduxPosts, loading: reduxLoading, hasMore: reduxHasMore, cursor: reduxCursor } = reduxState || {}
    
    // Local state fallback
    const [localPosts, setLocalPosts] = useState<Post[]>(initialPosts)
    const [localLoading, setLocalLoading] = useState(false)
    const [localHasMore, setLocalHasMore] = useState(true)
    const [localCursor, setLocalCursor] = useState<string | null>(null)
    
    const { ref, inView } = useInView()
    const [initialized, setInitialized] = useState(false)
    
    // Use Redux state if available, otherwise use local state
    const posts = reduxPosts || localPosts
    const loading = reduxLoading || localLoading
    const hasMore = reduxHasMore ?? localHasMore
    const cursor = reduxCursor || localCursor

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

    // Initialize Redux state with server-side posts if Redux is available
    useEffect(() => {
        if (dispatch && setInitialPosts && initialPosts.length > 0 && !initialized) {
            const serializedPosts = initialPosts.map(serializePost)
            dispatch(setInitialPosts(serializedPosts))
            setInitialized(true)
        } else if (!dispatch && initialPosts.length > 0 && !initialized) {
            // Fallback: use local state
            setLocalPosts(initialPosts)
            setInitialized(true)
        }
    }, [dispatch, initialPosts, initialized])

    // Initialize bookmark status when posts are loaded
    useEffect(() => {
        if (dispatch && initializeBookmarkStatus && session?.user?.id && posts.length > 0) {
            const postIds = posts.map((post: Post) => post.id)
            console.log('FeedList: Initializing bookmark status for', postIds.length, 'posts')
            dispatch(initializeBookmarkStatus({ postIds }))
        }
    }, [dispatch, initializeBookmarkStatus, session?.user?.id, posts.length])

    // Load more posts when scrolling
    useEffect(() => {
        if (inView && hasMore && !loading && cursor) {
            if (dispatch && fetchPosts) {
                // Use Redux
                dispatch(fetchPosts({ cursor }))
            } else {
                // Fallback: direct API call
                loadMorePostsFallback()
            }
        }
    }, [inView, hasMore, loading, cursor, dispatch])
    
    const loadMorePostsFallback = async () => {
        if (localLoading) return
        
        setLocalLoading(true)
        try {
            const params = new URLSearchParams()
            if (localCursor) params.append('cursor', localCursor)
            params.append('limit', '10')
            
            const response = await fetch(`/api/posts?${params}`)
            const data = await response.json()
            
            if (response.ok) {
                setLocalPosts(prev => [...prev, ...data.posts])
                setLocalCursor(data.nextCursor)
                setLocalHasMore(data.hasMore)
                
                // Initialize bookmark status for new posts
                if (dispatch && initializeBookmarkStatus && session?.user?.id && data.posts.length > 0) {
                    const postIds = data.posts.map((post: Post) => post.id)
                    dispatch(initializeBookmarkStatus({ postIds }))
                }
            }
        } catch (error) {
            console.error('Failed to load more posts:', error)
        } finally {
            setLocalLoading(false)
        }
    }

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
            {displayPosts.map((post: Post) => (
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
            <div ref={ref as any} className="h-[10px]" />
        </div>
    )
}
