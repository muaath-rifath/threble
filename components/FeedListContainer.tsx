'use client'

import { useState, useEffect } from 'react'
import { Session } from 'next-auth'
import { Post } from '@/lib/types'
import FeedList from './FeedList'
import PostForm from './PostForm'
import { useAppDispatch } from '@/lib/redux/hooks'
import { addPost } from '@/lib/redux/slices/postsSlice'
import { initializeBookmarkStatus } from '@/lib/redux/slices/bookmarksSlice'

interface FeedListContainerProps {
    session: Session
    initialPosts: Post[]
}

export default function FeedListContainer({ session, initialPosts }: FeedListContainerProps) {
    const [key, setKey] = useState(0)
    const dispatch = useAppDispatch()

    // Initialize bookmark status for initial posts
    useEffect(() => {
        if (session?.user?.id && initialPosts.length > 0) {
            const postIds = initialPosts.map(post => post.id)
            console.log('FeedListContainer: Initializing bookmark status for', postIds.length, 'posts')
            dispatch(initializeBookmarkStatus({ postIds }))
        }
    }, [session?.user?.id, initialPosts, dispatch])

    const handlePostCreated = (newPost: Post) => {
        // Serialize dates to strings before dispatching to Redux
        const serializedPost = {
            ...newPost,
            createdAt: typeof newPost.createdAt === 'string' ? newPost.createdAt : (newPost.createdAt as any)?.toISOString?.() || newPost.createdAt,
            updatedAt: typeof newPost.updatedAt === 'string' ? newPost.updatedAt : (newPost.updatedAt as any)?.toISOString?.() || newPost.updatedAt,
        }
        // Add new post to Redux store
        dispatch(addPost(serializedPost))
        // Force re-render to show the new post immediately
        setKey(prev => prev + 1)
    }

    return (
        <>
            <PostForm onPostCreated={handlePostCreated} />
            <FeedList key={key} session={session} initialPosts={initialPosts} />
        </>
    )
}