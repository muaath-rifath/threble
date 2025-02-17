'use client'

import { useState } from 'react'
import { Session } from 'next-auth'
import PostCard from './PostCard'
import { ExtendedPost } from '@/lib/types'

interface UserPostListProps {
    initialPosts: ExtendedPost[]
    session: Session
}

export default function UserPostList({ initialPosts, session }: UserPostListProps) {
    const [posts, setPosts] = useState(initialPosts)

    const handleUpdate = async () => {
        try {
            const response = await fetch('/api/posts/user')
            if (response.ok) {
                const data = await response.json()
                setPosts(data.posts)
            }
        } catch (error) {
            console.error('Error fetching user posts:', error)
        }
    }

    if (posts.length === 0) {
        return (
            <div className="text-center mt-8 text-slate-500 dark:text-slate-400">
                No posts yet.
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
                    onUpdate={handleUpdate}
                />
            ))}
        </div>
    )
}