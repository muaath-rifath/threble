'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import PostCard, { Post } from '@/components/post/PostCard'

interface PublicUserPostListProps {
    username: string
    type?: 'posts' | 'media' | 'likes'
}

export default function PublicUserPostList({ username, type = 'posts' }: PublicUserPostListProps) {
    const { data: session } = useSession()
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
                if (response.status === 404) {
                    setError('User not found')
                } else {
                    setError('Failed to load posts')
                }
                return
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
        let emptyMessage = "No posts yet."
        if (type === 'media') emptyMessage = "No media posts yet."
        if (type === 'likes') emptyMessage = "No liked posts yet."

        return (
            <div className="text-center py-10">
                <p className="text-gray-500">{emptyMessage}</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {posts.map((post) => (
                <PostCard
                    key={post.id}
                    post={post}
                    session={session!}
                    onUpdate={handlePostUpdate}
                />
            ))}
        </div>
    )
}
