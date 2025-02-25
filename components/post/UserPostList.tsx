'use client'

import { useState } from 'react'
import { Session } from 'next-auth'
import PostCard, { Post } from '@/components/post/PostCard'

interface UserPostListProps {
    session: Session
    initialPosts: Post[]
}

export default function UserPostList({ session, initialPosts }: UserPostListProps) {
    const [posts, setPosts] = useState<Post[]>(initialPosts)

    const handlePostUpdate = async () => {
        try {
            const response = await fetch('/api/posts/user')
            if (response.ok) {
                const data = await response.json()
                setPosts(data.posts)
            }
        } catch (error) {
            console.error('Error refreshing posts:', error)
        }
    }

    if (!posts.length) {
        return (
            <div className="text-center py-10">
                <p className="text-gray-500">You haven't posted anything yet.</p>
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
        </div>
    )
}