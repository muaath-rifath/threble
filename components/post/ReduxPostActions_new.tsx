'use client'

import { useState } from 'react'
import { Session } from 'next-auth'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { MessageSquare, Heart, Share2, Bookmark } from 'lucide-react'
import { useAppDispatch } from '@/lib/redux/hooks'
import { updatePostInState } from '@/lib/redux/slices/postsSlice'
import { Post } from '@/components/post/PostCard'

interface ReduxPostActionsProps {
    post: Post
    session: Session
    onReply?: () => void
}

export default function ReduxPostActions({ post, session, onReply }: ReduxPostActionsProps) {
    const dispatch = useAppDispatch()
    const { toast } = useToast()
    
    // Get current reaction state
    const userReaction = post.reactions?.find(r => r.userId === session.user?.id && r.type === 'LIKE')
    const hasLiked = !!userReaction
    const likeCount = post.reactions?.filter(r => r.type === 'LIKE').length || 0
    const replyCount = post._count?.replies || 0
    
    const [isProcessing, setIsProcessing] = useState(false)
    
    const handleLike = async () => {
        if (isProcessing) return
        setIsProcessing(true)
        
        try {
            const response = await fetch(`/api/posts/${post.id}/reactions`, {
                method: hasLiked ? 'DELETE' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'LIKE' })
            })
            
            if (!response.ok) {
                throw new Error('Failed to update reaction')
            }
            
            const result = await response.json()
            
            // Update post in Redux store with new reaction data
            const updatedReactions = hasLiked 
                ? post.reactions?.filter(r => !(r.userId === session.user.id && r.type === 'LIKE')) || []
                : [
                    ...(post.reactions || []),
                    {
                        id: result.reaction?.id || 'temp-' + Date.now(),
                        type: 'LIKE',
                        userId: session.user.id,
                        user: {
                            id: session.user.id,
                            name: session.user.name || null,
                            image: session.user.image || null
                        }
                    }
                ]
            
            dispatch(updatePostInState({
                ...post,
                reactions: updatedReactions,
                _count: {
                    ...post._count,
                    reactions: updatedReactions.length,
                    replies: replyCount
                }
            }))
            
            if (!hasLiked) {
                toast({
                    title: "Post liked!",
                    description: "Your reaction has been saved.",
                })
            }
            
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update reaction. Please try again.",
                variant: "destructive"
            })
        } finally {
            setIsProcessing(false)
        }
    }
    
    const handleReply = () => {
        if (onReply) {
            onReply()
        }
    }
    
    const handleShare = async () => {
        try {
            await navigator.share({
                title: `Post by ${post.author.name}`,
                text: post.content,
                url: `${window.location.origin}/thread/${post.id}`
            })
        } catch (error) {
            // Fallback to clipboard
            await navigator.clipboard.writeText(`${window.location.origin}/thread/${post.id}`)
            toast({
                title: "Link copied!",
                description: "Post link has been copied to clipboard.",
            })
        }
    }
    
    return (
        <div className="flex items-center justify-between px-6 pb-4">
            <div className="flex items-center space-x-4">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleLike}
                    disabled={isProcessing}
                    className={`flex items-center space-x-1 ${hasLiked ? 'text-red-500' : 'text-gray-500'}`}
                >
                    <Heart className={`w-4 h-4 ${hasLiked ? 'fill-current' : ''}`} />
                    <span>{likeCount}</span>
                </Button>
                
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleReply}
                    className="flex items-center space-x-1 text-gray-500"
                >
                    <MessageSquare className="w-4 h-4" />
                    <span>{replyCount}</span>
                </Button>
            </div>
            
            <div className="flex items-center space-x-2">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleShare}
                    className="text-gray-500"
                >
                    <Share2 className="w-4 h-4" />
                </Button>
                
                <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-gray-500"
                >
                    <Bookmark className="w-4 h-4" />
                </Button>
            </div>
        </div>
    )
}
