'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Session } from 'next-auth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'
import { Heart, MessageCircle, Share, MoreHorizontal, Edit, Trash } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow'
import Link from 'next/link'
import { Post } from '@/components/post/PostCard'
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks'
import { addReaction, removeReaction } from '@/lib/redux/slices/reactionsSlice'
import { updatePostReactions } from '@/lib/redux/slices/postsSlice'
import { deletePost } from '@/lib/redux/slices/postsSlice'

interface ReduxPostCardProps {
    post: Post
    session: Session
    isReply?: boolean
    showFullContent?: boolean
    hideRepliedTo?: boolean
}

export default function ReduxPostCard({ 
    post, 
    session, 
    isReply = false, 
    showFullContent = false, 
    hideRepliedTo = false 
}: ReduxPostCardProps) {
    const dispatch = useAppDispatch()
    const router = useRouter()
    const { toast } = useToast()
    
    // Get reactions from Redux store
    const postReactions = useAppSelector(state => state.reactions.reactions[post.id] || post.reactions)
    const reactionCounts = useAppSelector(state => state.reactions.reactionCounts[post.id])
    const isReactionLoading = useAppSelector(state => state.reactions.loading[post.id] || false)
    
    const [isDeleting, setIsDeleting] = useState(false)
    const [showDropdown, setShowDropdown] = useState(false)

    const isAuthor = session?.user?.id === post.author.id
    
    // Calculate like status and count
    const userLiked = postReactions?.some(r => r.userId === session?.user?.id && r.type === 'LIKE')
    const likeCount = reactionCounts?.LIKE || postReactions?.filter(r => r.type === 'LIKE').length || 0
    
    const displayContent = showFullContent || post.content.length <= 150 
        ? post.content 
        : `${post.content.slice(0, 150)}...`

    const handleToggleLike = async () => {
        if (!session?.user?.id || isReactionLoading) return

        try {
            if (userLiked) {
                await dispatch(removeReaction({ postId: post.id, type: 'LIKE', userId: session.user.id }))
            } else {
                await dispatch(addReaction({ postId: post.id, type: 'LIKE' }))
            }
        } catch (error) {
            console.error('Error toggling like:', error)
            toast({
                title: "Error",
                description: "Failed to update reaction. Please try again.",
                variant: "destructive",
            })
        }
    }

    const handleDelete = async () => {
        if (!isAuthor) return

        setIsDeleting(true)
        try {
            const result = await dispatch(deletePost(post.id))
            if (deletePost.fulfilled.match(result)) {
                toast({ 
                    title: "Success", 
                    description: "Post deleted successfully." 
                })
            } else {
                throw new Error('Failed to delete post')
            }
        } catch (error) {
            console.error('Error deleting post:', error)
            toast({
                title: "Error",
                description: "Failed to delete post. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsDeleting(false)
            setShowDropdown(false)
        }
    }

    const handleShare = async () => {
        const postUrl = `${window.location.origin}/thread/${post.id}`
        
        try {
            if (navigator.share) {
                await navigator.share({
                    title: `Post by ${post.author.name}`,
                    url: postUrl,
                })
            } else {
                await navigator.clipboard.writeText(postUrl)
                toast({
                    title: "Link copied!",
                    description: "Post link has been copied to clipboard.",
                })
            }
        } catch (error) {
            console.error('Error sharing:', error)
            toast({
                title: "Error",
                description: "Failed to share post. Please try again.",
                variant: "destructive",
            })
        }
    }

    return (
        <Card className={`${isReply ? 'ml-6 border-l-2 border-blue-200' : ''}`}>
            <CardContent className="p-6">
                {/* Replied to indicator */}
                {post.parent && !hideRepliedTo && (
                    <div className="mb-3 text-sm text-gray-500">
                        Replying to{' '}
                        <Link 
                            href={`/${post.parent.author.name}`} 
                            className="text-blue-600 hover:underline font-medium"
                        >
                            @{post.parent.author.name}
                        </Link>
                    </div>
                )}

                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-3">
                        <Link href={`/${post.author.name}`}>
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={post.author.image || undefined} />
                                <AvatarFallback>
                                    {post.author.name?.[0]?.toUpperCase() || 'U'}
                                </AvatarFallback>
                            </Avatar>
                        </Link>
                        <div>
                            <Link 
                                href={`/${post.author.name}`}
                                className="font-semibold hover:underline"
                            >
                                {post.author.name}
                            </Link>
                            <p className="text-sm text-gray-500">
                                {formatDistanceToNow(new Date(post.createdAt))} ago
                            </p>
                        </div>
                    </div>

                    {/* Options dropdown */}
                    {isAuthor && (
                        <div className="relative">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowDropdown(!showDropdown)}
                                className="h-8 w-8 p-0"
                            >
                                <MoreHorizontal size={16} />
                            </Button>
                            
                            {showDropdown && (
                                <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[120px]">
                                    <button
                                        onClick={() => {
                                            router.push(`/thread/${post.id}/edit`)
                                            setShowDropdown(false)
                                        }}
                                        className="flex items-center w-full px-3 py-2 text-sm text-left hover:bg-gray-100"
                                    >
                                        <Edit size={14} className="mr-2" />
                                        Edit
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        disabled={isDeleting}
                                        className="flex items-center w-full px-3 py-2 text-sm text-left hover:bg-gray-100 text-red-600"
                                    >
                                        <Trash size={14} className="mr-2" />
                                        {isDeleting ? 'Deleting...' : 'Delete'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Content */}
                <Link href={`/thread/${post.id}`}>
                    <div className="mb-4 cursor-pointer hover:opacity-80 transition-opacity">
                        <p className="whitespace-pre-wrap text-gray-900 leading-relaxed">
                            {displayContent}
                        </p>
                        {!showFullContent && post.content.length > 150 && (
                            <span className="text-blue-600 hover:underline text-sm mt-1 inline-block">
                                Show more
                            </span>
                        )}
                    </div>
                </Link>

                {/* Media attachments */}
                {post.mediaAttachments && post.mediaAttachments.length > 0 && (
                    <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                        {post.mediaAttachments.map((mediaUrl, index) => (
                            <div key={index} className="rounded-lg overflow-hidden border">
                                <img
                                    src={mediaUrl}
                                    alt="Post attachment"
                                    className="w-full h-auto object-cover"
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center space-x-6">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleToggleLike}
                            disabled={isReactionLoading}
                            className={`flex items-center space-x-1 ${
                                userLiked 
                                    ? 'text-red-600 hover:text-red-700' 
                                    : 'text-gray-500 hover:text-red-600'
                            }`}
                        >
                            <Heart 
                                size={16} 
                                className={userLiked ? 'fill-current' : ''} 
                            />
                            <span>{likeCount}</span>
                        </Button>

                        <Link href={`/thread/${post.id}`}>
                            <Button variant="ghost" size="sm" className="flex items-center space-x-1 text-gray-500 hover:text-blue-600">
                                <MessageCircle size={16} />
                                <span>{post._count?.replies || 0}</span>
                            </Button>
                        </Link>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleShare}
                            className="flex items-center space-x-1 text-gray-500 hover:text-green-600"
                        >
                            <Share size={16} />
                            <span>Share</span>
                        </Button>
                    </div>
                </div>

                {/* Click outside to close dropdown */}
                {showDropdown && (
                    <div 
                        className="fixed inset-0 z-0" 
                        onClick={() => setShowDropdown(false)}
                    />
                )}
            </CardContent>
        </Card>
    )
}
