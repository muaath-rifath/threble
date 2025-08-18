'use client'

import { useState, useEffect } from 'react'
import { Session } from 'next-auth'
import PostCard, { Post } from '@/components/post/PostCard'

interface UserPostsByUsernameProps {
    username: string
    session: Session | null
    type?: 'posts' | 'media' | 'likes'
}

export default function UserPostsByUsername({ username, session, type = 'posts' }: UserPostsByUsernameProps) {
    const [posts, setPosts] = useState<Post[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchPosts()
    }, [username, type])

    const fetchPosts = async () => {
        try {
            setLoading(true)
            setError(null)
            
            const response = await fetch(`/api/posts/user/${username}?type=${type}`)
            
            if (!response.ok) {
                throw new Error('Failed to fetch posts')
            }

            const data = await response.json()
            setPosts(data.posts || [])
        } catch (error) {
            console.error('Error fetching posts:', error)
            setError('Failed to load posts')
        } finally {
            setLoading(false)
        }
    }

    const handlePostUpdate = () => {
        fetchPosts()
    }

    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="text-center py-8">
                <p className="text-red-500">{error}</p>
            </div>
        )
    }

    if (!posts.length) {
        const emptyMessage = {
            posts: "No posts yet.",
            media: "No media posts yet.",
            likes: "No liked posts yet."
        }

        return (
            <div className="text-center py-10">
                <p className="text-gray-500">{emptyMessage[type]}</p>
            </div>
        )
    }

    if (!session) {
        return (
            <div className="text-center py-8">
                <p className="text-gray-500">Please sign in to view posts</p>
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
