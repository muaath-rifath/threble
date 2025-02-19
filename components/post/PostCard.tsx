'use client'

import { useState, useEffect } from 'react'
import { Session } from 'next-auth'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { MessageSquare, ThumbsUp, Share2, MoreHorizontal, Edit, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"

interface PostCardProps {
    post: {
        id: string
        content: string
        author: {
            id: string
            name: string | null
            image: string | null
        }
        createdAt: string
        reactions: Array<{
            id: string
            type: string
            userId: string
            user?: {
                id: string
                name: string
                image: string | null
            }
        }>
        _count: {
            replies: number
            reactions?: number
        }
        mediaAttachments?: string[]
    }
    session: Session
    onUpdate: () => void
    isReply?: boolean
    showFullContent?: boolean
}

export default function PostCard({ post, session, onUpdate, isReply = false, showFullContent = false }: PostCardProps) {
    const router = useRouter()
    const { toast } = useToast()
    const [isUpdating, setIsUpdating] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [likeCount, setLikeCount] = useState(post.reactions.filter(r => r.type === 'LIKE').length)
    const [showLikes, setShowLikes] = useState(false)
    const [likedUsers, setLikedUsers] = useState<Array<{ id: string; name: string; image: string | null }>>([])

    const isAuthor = session?.user?.id === post.author.id
    const isLiked = post.reactions.some(r => r.userId === session?.user?.id && r.type === 'LIKE')

    const handleLike = async () => {
        if (!session?.user?.id || isUpdating) return

        setIsUpdating(true)
        const currentLikeState = isLiked
        const currentCount = likeCount

        try {
            // Optimistic update
            setLikeCount(prev => currentLikeState ? prev - 1 : prev + 1)

            const method = currentLikeState ? 'DELETE' : 'POST'
            const url = `/api/posts/${post.id}/reactions${currentLikeState ? '?type=LIKE' : ''}`

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                ...(method === 'POST' && { body: JSON.stringify({ type: 'LIKE' }) })
            })

            if (!response.ok) {
                // Revert optimistic updates
                setLikeCount(currentCount)
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to update reaction')
            }

            onUpdate()
        } catch (error) {
            console.error('Error updating reaction:', error)
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to update reaction. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsUpdating(false)
        }
    }

    const handleDelete = async () => {
        if (!isAuthor) return

        try {
            const response = await fetch(`/api/posts/${post.id}`, {
                method: 'DELETE',
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Failed to delete post')
            }

            toast({ 
                title: "Success", 
                description: "Post deleted successfully." 
            })
            onUpdate()
            if (!isReply) {
                router.push('/')
            }
        } catch (error: any) {
            console.error('Error deleting post:', error)
            toast({
                title: "Error",
                description: error.message || "Failed to delete post. Please try again.",
                variant: "destructive",
            })
        }
    }

    const handleShare = async () => {
        try {
            await navigator.share({
                title: 'Share Post',
                text: post.content,
                url: `${window.location.origin}/post/${post.id}`
            })
        } catch (error) {
            if ((error as Error).name !== 'AbortError') {
                toast({
                    title: "Share failed",
                    description: "Couldn't share the post. Try copying the link instead.",
                    variant: "destructive",
                })
            }
        }
    }

    const navigateToPost = () => {
        if (!isReply) {
            router.push(`/post/${post.id}`)
        }
    }

    const fetchLikedUsers = async () => {
        try {
            const response = await fetch(`/api/posts/${post.id}/reactions`)
            if (response.ok) {
                const data = await response.json()
                const likes = data.reactions.filter((r: any) => r.type === 'LIKE')
                setLikedUsers(likes.map((r: any) => r.user))
            }
        } catch (error) {
            console.error('Error fetching likes:', error)
        }
    }

    useEffect(() => {
        if (showLikes) {
            fetchLikedUsers()
        }
    }, [showLikes, post.id])

    return (
        <Card className={`${isReply ? 'mt-4' : 'mb-8'} border-none bg-white dark:bg-slate-900 shadow-sm`}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Avatar className="h-10 w-10 cursor-pointer" onClick={() => router.push(`/profile/${post.author.id}`)}>
                            <AvatarImage src={post.author.image || undefined} alt={post.author.name || 'User'} />
                            <AvatarFallback>{post.author.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium cursor-pointer" onClick={() => router.push(`/profile/${post.author.id}`)}>{post.author.name}</p>
                            <p className="text-xs text-gray-500">{format(new Date(post.createdAt), 'MMM d, yyyy')}</p>
                        </div>
                    </div>
                    {isAuthor && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="hover:bg-slate-100 dark:hover:bg-slate-800 h-10 w-10"
                                >
                                    <MoreHorizontal className="h-5 w-5 text-slate-500" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem onClick={() => router.push(`/post/${post.id}/edit`)}>
                                    <Edit className="mr-3 h-5 w-5" />
                                    Edit post
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    onClick={handleDelete}
                                    className="text-red-600 dark:text-red-400"
                                >
                                    <Trash2 className="mr-3 h-5 w-5" />
                                    Delete post
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </CardHeader>
            <CardContent className="pb-3" onClick={navigateToPost}>
                <p className={`text-sm text-gray-500 dark:text-gray-400 ${!showFullContent && 'line-clamp-3'}`}>
                    {post.content}
                </p>
                {post.mediaAttachments && post.mediaAttachments.length > 0 && (
                    <div className="mt-3 grid grid-cols-1 gap-2">
                        {post.mediaAttachments.map((url, index) => {
                            if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                                return (
                                    <img
                                        key={index}
                                        src={url}
                                        alt={`Attachment ${index + 1}`}
                                        className="rounded-lg max-h-96 object-contain"
                                    />
                                )
                            }
                            return null
                        })}
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-3">
                <Sheet open={showLikes} onOpenChange={setShowLikes}>
                    <SheetTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="flex items-center gap-2"
                        >
                            <div 
                                className="flex items-center"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleLike()
                                }}
                            >
                                <ThumbsUp className={`h-4 w-4 ${isLiked ? 'text-blue-500' : ''}`} />
                                <span className="ml-2">{likeCount}</span>
                            </div>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-[400px]">
                        <SheetHeader>
                            <SheetTitle>Liked by</SheetTitle>
                        </SheetHeader>
                        <ScrollArea className="h-full py-4">
                            <div className="space-y-4">
                                {likedUsers.map((user) => (
                                    <div key={user.id} className="flex items-center gap-3 px-4">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={user.image || undefined} />
                                            <AvatarFallback>{user.name?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="text-sm font-medium">{user.name}</p>
                                        </div>
                                    </div>
                                ))}
                                {likedUsers.length === 0 && (
                                    <p className="text-center text-sm text-gray-500">No likes yet</p>
                                )}
                            </div>
                        </ScrollArea>
                    </SheetContent>
                </Sheet>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/post/${post.id}`)}
                    className="flex items-center space-x-2"
                >
                    <MessageSquare className="h-4 w-4" />
                    <span>{post._count.replies}</span>
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleShare}
                    className="flex items-center space-x-2"
                >
                    <Share2 className="h-4 w-4" />
                </Button>
            </CardFooter>
        </Card>
    )
}