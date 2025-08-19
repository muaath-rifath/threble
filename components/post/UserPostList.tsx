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
    const [isUpdating, setIsUpdating] = useState(false)

    const handlePostUpdate = async () => {
        try {
            setIsUpdating(true)
            const response = await fetch('/api/posts/user')
            if (response.ok) {
                const data = await response.json()
                setPosts(data.posts || [])
            }
        } catch (error) {
            console.error('Error refreshing posts:', error)
        } finally {
            setIsUpdating(false)
        }
    }

    return (
        <div className="space-y-6">
            {posts.map((post, index) => (
                <div 
                    key={post.id}
                    className={`transition-all duration-300 ${isUpdating ? 'opacity-50' : 'opacity-100'}`}
                >
                    <PostCard
                        post={post}
                        session={session}
                        onUpdate={handlePostUpdate}
                        showFullContent={true}
                    />
                    {index < posts.length - 1 && (
                        <div className="border-b border-gray-100 dark:border-gray-800 mt-6" />
                    )}
                </div>
            ))}
        </div>
    )
}