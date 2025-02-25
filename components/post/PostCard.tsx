'use client'

import { useState, useEffect } from 'react'
import { Session } from 'next-auth'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { MessageSquare, ThumbsUp, Share2, MoreHorizontal, Edit, Trash2, ChevronRight, Image, Video, X } from 'lucide-react'
import { format } from 'date-fns'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

export interface Post {
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
            name: string | null
            image: string | null
        }
    }>
    _count: {
        replies: number
        reactions?: number
    }
    mediaAttachments?: string[]
}

interface PostCardProps {
    post: Post
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
    const [isLoadingReactions, setIsLoadingReactions] = useState(false)
    const [reactionUsers, setReactionUsers] = useState<Array<{
        id: string
        name: string | null
        image: string | null
    }>>([])
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [editContent, setEditContent] = useState(post.content)
    const [keepMediaUrls, setKeepMediaUrls] = useState<string[]>(post.mediaAttachments || [])
    const [editMediaFiles, setEditMediaFiles] = useState<File[]>([])

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

    const loadReactions = async () => {
        try {
            setIsLoadingReactions(true)
            const response = await fetch(`/api/posts/${post.id}/reactions`)
            if (!response.ok) {
                throw new Error('Failed to load reactions')
            }
            const data = await response.json()
            const users = data.reactions.map((r: any) => r.user).filter(Boolean)
            setReactionUsers(users)
        } catch (error) {
            console.error('Error loading reactions:', error)
            toast({
                title: "Error",
                description: "Failed to load reactions",
                variant: "destructive",
            })
        } finally {
            setIsLoadingReactions(false)
        }
    }

    const handleEdit = async () => {
        if (!isAuthor) return;

        try {
            const formData = new FormData();
            formData.append('content', editContent);
            formData.append('keepMediaUrls', keepMediaUrls.join(','));
            
            editMediaFiles.forEach(file => {
                formData.append('mediaAttachments', file);
            });

            const response = await fetch(`/api/posts/${post.id}`, {
                method: 'PATCH',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to update post');
            }

            toast({ 
                title: "Success", 
                description: "Post updated successfully." 
            });
            setIsEditing(false);
            onUpdate();
        } catch (error: any) {
            console.error('Error updating post:', error);
            toast({
                title: "Error",
                description: error.message || "Failed to update post. Please try again.",
                variant: "destructive",
            });
        }
    };

    const handleFileSelect = (acceptedTypes: string) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = acceptedTypes;
        input.multiple = true;
        input.onchange = (e: Event) => {
            const files = Array.from((e.target as HTMLInputElement).files || []);
            if (files.length > 0) {
                const invalidFiles = files.filter(file => file.size > 20 * 1024 * 1024);
                if (invalidFiles.length > 0) {
                    toast({
                        title: "Error",
                        description: "Files must be less than 20MB",
                        variant: "destructive",
                    });
                    return;
                }
                setEditMediaFiles(prev => [...prev, ...files]);
            }
        };
        input.click();
    };

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
                                <DropdownMenuItem
                                    onClick={() => setIsEditing(true)}
                                    className="action-dropdown-item"
                                >
                                    <Edit className="mr-3 h-5 w-5" />
                                    Edit post
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => setIsDeleteDialogOpen(true)}
                                    className="action-dropdown-item-delete"
                                >
                                    <Trash2 className="mr-3 h-5 w-5" />
                                    Delete post
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {isEditing ? (
                    <div className="space-y-4">
                        <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="min-h-[100px] mb-4"
                        />
                        {(keepMediaUrls.length > 0 || editMediaFiles.length > 0) && (
                            <div className="grid grid-cols-2 gap-2">
                                {keepMediaUrls.map((url, index) => (
                                    <div key={url} className="relative aspect-square">
                                        {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                            <img
                                                src={url}
                                                alt={`Media ${index + 1}`}
                                                className="w-full h-full object-cover rounded-lg"
                                            />
                                        ) : url.match(/\.(mp4|webm|ogg)$/i) && (
                                            <video
                                                src={url}
                                                className="w-full h-full object-cover rounded-lg"
                                                controls
                                            />
                                        )}
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            className="absolute top-2 right-2 h-6 w-6"
                                            onClick={() => setKeepMediaUrls(prev => prev.filter(u => u !== url))}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                {editMediaFiles.map((file, index) => (
                                    <div key={index} className="relative aspect-square">
                                        {file.type.startsWith('image/') ? (
                                            <img
                                                src={URL.createObjectURL(file)}
                                                alt={`New media ${index + 1}`}
                                                className="w-full h-full object-cover rounded-lg"
                                            />
                                        ) : file.type.startsWith('video/') && (
                                            <video
                                                src={URL.createObjectURL(file)}
                                                className="w-full h-full object-cover rounded-lg"
                                                controls
                                            />
                                        )}
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            className="absolute top-2 right-2 h-6 w-6"
                                            onClick={() => setEditMediaFiles(prev => prev.filter((_, i) => i !== index))}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-4">
                            <div className="flex space-x-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="text-green-500"
                                    onClick={() => handleFileSelect('image/*')}
                                >
                                    <Image className="mr-2 h-4 w-4" />
                                    Photo
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="text-blue-500"
                                    onClick={() => handleFileSelect('video/*')}
                                >
                                    <Video className="mr-2 h-4 w-4" />
                                    Video
                                </Button>
                            </div>
                            <div className="flex space-x-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setIsEditing(false)
                                        setEditContent(post.content)
                                        setKeepMediaUrls(post.mediaAttachments || [])
                                        setEditMediaFiles([])
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleEdit}
                                    className="bg-blue-500 hover:bg-blue-600 text-white"
                                >
                                    Save Changes
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <p className="text-slate-800 dark:text-slate-200">
                            {showFullContent ? post.content : post.content.slice(0, 280)}
                            {!showFullContent && post.content.length > 280 && (
                                <>
                                    ...{' '}
                                    <Button
                                        variant="link"
                                        className="p-0 h-auto text-blue-500"
                                        onClick={() => router.push(`/post/${post.id}`)}
                                    >
                                        Show more
                                    </Button>
                                </>
                            )}
                        </p>
                        {post.mediaAttachments && post.mediaAttachments.length > 0 && (
                            <div className={`mt-4 grid ${post.mediaAttachments.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
                                {post.mediaAttachments.map((url, index) => (
                                    <div key={url} className={`relative ${post.mediaAttachments?.length === 1 ? 'aspect-auto max-h-[512px]' : 'aspect-square'}`}>
                                        {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                            <img
                                                src={url}
                                                alt={`Media ${index + 1}`}
                                                className={`w-full h-full ${post.mediaAttachments?.length === 1 ? 'object-contain' : 'object-cover'} rounded-lg`}
                                            />
                                        ) : url.match(/\.(mp4|webm|ogg)$/i) && (
                                            <video
                                                src={url}
                                                className={`w-full h-full ${post.mediaAttachments?.length === 1 ? 'object-contain' : 'object-cover'} rounded-lg`}
                                                controls
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </CardContent>
            <CardFooter className="flex justify-between border-t border-slate-100 dark:border-slate-800 mt-4 pt-4">
                <Sheet>
                    <div className="flex items-center space-x-1">
                        <Button
                            variant="ghost"
                            onClick={handleLike}
                            className={`post-action-button ${
                                post.reactions.some(r => r.userId === session.user.id && r.type === 'LIKE') 
                                    ? 'post-action-button-active' 
                                    : ''
                            }`}
                        >
                            <ThumbsUp className="h-5 w-5" />
                            <span className="ml-2">
                                {post._count.reactions || post.reactions.filter(r => r.type === 'LIKE').length}
                            </span>
                        </Button>
                        {(post._count.reactions || post.reactions.filter(r => r.type === 'LIKE').length) > 0 && (
                            <SheetTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="like-trigger-button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        if (!isLoadingReactions && reactionUsers.length === 0) {
                                            loadReactions()
                                        }
                                    }}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </SheetTrigger>
                        )}
                    </div>
                    <SheetContent 
                        side="bottom" 
                        className="p-0 h-[85vh] sm:max-w-none rounded-t-[20px]"
                    >
                        <div className="p-6">
                            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mb-6" />
                            <SheetHeader>
                                <SheetTitle>People who liked this</SheetTitle>
                            </SheetHeader>
                            <div className="mt-4 space-y-4 overflow-y-auto max-h-[calc(85vh-120px)]">
                                {isLoadingReactions ? (
                                    <div className="text-center py-4 text-sm text-slate-500">
                                        Loading...
                                    </div>
                                ) : reactionUsers.length > 0 ? (
                                    reactionUsers.map((user) => (
                                        <div key={user.id} className="flex items-center space-x-3">
                                            <Avatar>
                                                <AvatarImage src={user.image || undefined} />
                                                <AvatarFallback>{user.name?.[0]}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium text-sm">{user.name}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-4 text-sm text-slate-500">
                                        No likes yet
                                    </div>
                                )}
                            </div>
                        </div>
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
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your post
                            and remove all associated data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                handleDelete()
                                setIsDeleteDialogOpen(false)
                            }}
                            className="bg-red-600 text-white hover:bg-red-700"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    )
}