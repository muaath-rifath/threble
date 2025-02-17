'use client'

import { useState } from 'react'
import { Session } from 'next-auth'
import PostCard from './post/PostCard'
import { ExtendedPost } from '@/lib/types'

interface FeedListProps {
    initialPosts: ExtendedPost[]
    session: Session
}

export default function FeedList({ initialPosts, session }: FeedListProps) {
    const [posts, setPosts] = useState(initialPosts)

    const handleUpdate = async () => {
        try {
            const response = await fetch('/api/posts')
            if (response.ok) {
                const data = await response.json()
                setPosts(data.posts)
            }
        } catch (error) {
            console.error('Error fetching posts:', error)
        }
    }

    return (
        <div className="w-full space-y-4">
            {posts.map((post) => (
                <PostCard
                    key={post.id}
                    post={post}
                    session={session}
                    onUpdate={handleUpdate}
                />
            ))}
        </div>
    )
}
