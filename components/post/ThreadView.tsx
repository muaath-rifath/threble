'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Session } from 'next-auth'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageSquare, ChevronLeft, Users } from 'lucide-react'
import { ExtendedPost } from '@/lib/types'

import PostCard, { Post } from './PostCard'
import PaginatedReplies from './PaginatedReplies'

// Helper function to transform ExtendedPost to Post interface
const transformExtendedPostToPost = (extendedPost: ExtendedPost): Post => {
    return {
        id: extendedPost.id,
        content: extendedPost.content,
        author: {
            id: extendedPost.author.id,
            name: extendedPost.author.name,
            username: extendedPost.author.username,
            image: extendedPost.author.image,
        },
        createdAt: extendedPost.createdAt,
        updatedAt: extendedPost.updatedAt,
        reactions: extendedPost.reactions.map(r => ({
            id: r.id,
            type: r.type,
            userId: r.userId,
            user: {
                id: r.userId,
                name: null,
                image: null
            }
        })),
        _count: extendedPost._count,
        mediaAttachments: extendedPost.mediaAttachments,
        parent: extendedPost.parent ? {
            id: extendedPost.parent.id,
            author: {
                id: extendedPost.parent.author.id,
                name: extendedPost.parent.author.name,
                username: extendedPost.parent.author.username,
            }
        } : undefined
    }
}

interface ThreadViewProps {
    initialPost: ExtendedPost
    session: Session
}

export default function ThreadView({ initialPost, session }: ThreadViewProps) {
    const router = useRouter()
    const { toast } = useToast()
    const [post, setPost] = useState<ExtendedPost>(initialPost)
    const [isLoading, setIsLoading] = useState(false)

    const fetchPost = async () => {
        try {
            setIsLoading(true)
            const response = await fetch(`/api/posts/${post.id}`)
            if (response.ok) {
                const data = await response.json()
                setPost(data)
            }
        } catch (error) {
            console.error('Error fetching post:', error)
            toast({
                title: "Error",
                description: "Failed to refresh thread. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const totalReplies = post._count?.replies || 0

    return (
        <div className="min-h-screen bg-white dark:bg-black">
            <div className="container max-w-4xl mx-auto p-4 md:p-6">

                {/* Back Button */}
                <div className="mb-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                        aria-label="Go back to previous page"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                </div>

                {/* Main Post */}
                <div className="mb-8">
                    <PostCard
                        post={transformExtendedPostToPost(post)}
                        session={session}
                        onUpdate={fetchPost}
                        isReply={!!post.parent}
                        showFullContent={true}
                        hideRepliedTo={true}
                    />
                </div>

                {/* Thread Replies Section */}
                {totalReplies > 0 ? (
                    <div className="space-y-6">
                        {/* Replies Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="h-5 w-5 text-primary-500" />
                                    <h2 className="text-xl font-semibold text-black dark:text-white">
                                        Replies
                                    </h2>
                                </div>
                                <span className="px-3 py-1 bg-primary-500/10 text-primary-500 text-sm font-medium rounded-full border border-glass-border dark:border-glass-border-dark">
                                    {totalReplies}
                                </span>
                            </div>
                            
                            {/* Thread Stats */}
                            <div className="hidden md:flex items-center gap-4 text-sm text-gray-500">
                                <div className="px-2 py-1 glass-button text-gray-600 dark:text-gray-400 rounded-lg">
                                    <span>Active thread</span>
                                </div>
                            </div>
                        </div>

                        {/* Paginated Replies */}
                        <PaginatedReplies
                            parentId={post.id}
                            session={session}
                            onUpdate={fetchPost}
                            depth={0}
                            maxDepth={4}
                            parentAuthors={[post.author.username || post.author.name || 'unknown']}
                            initialRepliesCount={totalReplies}
                        />
                    </div>
                ) : (
                    /* Empty State for No Replies */
                    <Card className="glass-card shadow-lg text-center py-12">
                        <CardContent>
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-16 h-16 glass-card rounded-full flex items-center justify-center">
                                    <MessageSquare className="h-8 w-8 text-gray-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium text-black dark:text-white mb-2">
                                        No replies yet
                                    </h3>
                                    <p className="text-gray-500 text-sm max-w-md mx-auto">
                                        Be the first to join the conversation! Share your thoughts or ask a question.
                                    </p>
                                </div>
                                <Button
                                    onClick={() => {
                                        window.scrollTo({ top: 0, behavior: 'smooth' })
                                    }}
                                    className="primary-button mt-2"
                                >
                                    Start the conversation
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}