'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import PostDetail from '@/components/post/PostDetail'
import { ExtendedPost } from '@/lib/types'

export default function PostDetailPage({ params }: { params: { postId: string } }) {
    const { data: session } = useSession()
    const router = useRouter()
    const [post, setPost] = useState<ExtendedPost | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchPost()
    }, [params.postId])

    const fetchPost = async () => {
        try {
            const response = await fetch(`/api/posts/${params.postId}`)
            if (response.ok) {
                const data = await response.json()
                setPost(data)
            } else {
                console.error('Failed to fetch post:', response.statusText)
                router.push('/')
            }
        } catch (error) {
            console.error('Error fetching post:', error)
            router.push('/')
        } finally {
            setIsLoading(false)
        }
    }

    if (!session) {
        return <div className="text-center mt-8">Please sign in to view posts.</div>
    }

    if (isLoading) {
        return <div className="text-center mt-8">Loading...</div>
    }

    if (!post) {
        return <div className="text-center mt-8">Post not found.</div>
    }

    return <PostDetail initialPost={post} session={session} />
}
