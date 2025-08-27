'use client'

import { useEffect } from 'react'
import { Session } from 'next-auth'
import FeedList from './FeedList'
import PostForm from './PostForm'
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks'
import { setInitialPosts } from '@/lib/redux/slices/postsSlice'
import { Post } from '@/components/post/PostCard'

interface ReduxFeedListContainerProps {
    session: Session
    initialPosts: Post[]
}

export default function ReduxFeedListContainer({ session, initialPosts }: ReduxFeedListContainerProps) {
    const dispatch = useAppDispatch()
    const { posts } = useAppSelector((state) => state.posts)
    
    // Initialize posts in Redux store
    useEffect(() => {
        if (initialPosts.length > 0 && posts.length === 0) {
            dispatch(setInitialPosts(initialPosts))
        }
    }, [dispatch, initialPosts, posts.length])

    return (
        <>
            <PostForm />
            <FeedList 
                session={session} 
                initialPosts={initialPosts}
            />
        </>
    )
}
