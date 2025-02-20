'use client'

import { useState } from 'react'
import { Session } from 'next-auth'
import { Post } from '@/lib/types'
import FeedList from './FeedList'
import PostForm from './PostForm'

interface FeedListContainerProps {
    session: Session
    initialPosts: Post[]
}

export default function FeedListContainer({ session, initialPosts }: FeedListContainerProps) {
    const [key, setKey] = useState(0)

    return (
        <>
            <PostForm onPostCreated={() => setKey(prev => prev + 1)} />
            <FeedList key={key} session={session} initialPosts={initialPosts} />
        </>
    )
}