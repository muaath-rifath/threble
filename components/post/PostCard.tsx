'use client'

import { useState, useEffect, useRef } from 'react'
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
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks'
import { addReaction, removeReaction, updatePostReactions as updateReactionsInSlice } from '@/lib/redux/slices/reactionsSlice'

export interface Post {
    id: string
    content: string
    author: {
        id: string
        name: string | null
        username?: string | null
        image: string | null
    }
    createdAt: string
    updatedAt: string
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
    parent?: {
        id: string
        author: {
            id: string
            name: string | null
            username?: string | null
        }
    }
}

interface PostCardProps {
    post: Post
    session: Session
    onUpdate: () => void
    isReply?: boolean
    showFullContent?: boolean
    hideRepliedTo?: boolean // New prop to hide "Replied to" indicator
}

export default function PostCard({ post, session, onUpdate, isReply = false, showFullContent = false, hideRepliedTo = false }: PostCardProps) {
    const router = useRouter()
    const { toast } = useToast()
    const dispatch = useAppDispatch()
    
    // Get reactions from Redux store, fallback to post reactions
    const postReactions = useAppSelector(state => state.reactions.reactions[post.id] || post.reactions)
    const reactionCounts = useAppSelector(state => state.reactions.reactionCounts[post.id])
    const isReactionLoading = useAppSelector(state => state.reactions.loading[post.id] || false)
    
    // Initialize reactions in Redux store if not already there
    useEffect(() => {
        const reduxReactions = postReactions
        const postHasReactions = post.reactions && post.reactions.length > 0
        const reduxHasReactions = reduxReactions && reduxReactions.length > 0
        
        // Only initialize if Redux doesn't have reactions for this post
        if (!reduxHasReactions && postHasReactions) {
            // Calculate reaction counts from post reactions
            const counts: Record<string, number> = {}
            post.reactions?.forEach(reaction => {
                counts[reaction.type] = (counts[reaction.type] || 0) + 1
            })
            
            // Initialize Redux state with post reactions
            dispatch(updateReactionsInSlice({
                postId: post.id,
                reactions: post.reactions || [],
                reactionCounts: counts
            }))
        }
    }, [dispatch, post.id, post.reactions, postReactions])
    
    const [isUpdating, setIsUpdating] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [showLikes, setShowLikes] = useState(false)
    const [likedUsers, setLikedUsers] = useState<Array<{ id: string; name: string; image: string | null }>>([])
    const [isLoadingReactions, setIsLoadingReactions] = useState(false)
    const [reactionUsers, setReactionUsers] = useState<Array<{
        id: string
        name: string | null
        image: string | null
    }>>([])
    
    // Calculate like count from Redux state or post reactions
    const likeCount = reactionCounts?.LIKE || postReactions?.filter(r => r.type === 'LIKE').length || 0
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [editContent, setEditContent] = useState(post.content)
    const [keepMediaUrls, setKeepMediaUrls] = useState<string[]>(post.mediaAttachments || [])
    const [editMediaFiles, setEditMediaFiles] = useState<File[]>([])
    const [isReplying, setIsReplying] = useState(false)
    const [replyContent, setReplyContent] = useState('')
    const [replyMediaFiles, setReplyMediaFiles] = useState<File[]>([])
    const [isSubmittingReply, setIsSubmittingReply] = useState(false)
    const replyTextareaRef = useRef<HTMLTextAreaElement>(null)

    const isAuthor = session?.user?.id === post.author.id
    const isLiked = postReactions?.some(r => r.userId === session?.user?.id && r.type === 'LIKE') || false
    const isEdited = new Date(post.updatedAt) > new Date(post.createdAt)

    const handleLike = async () => {
        if (!session?.user?.id || isReactionLoading) return

        console.log('handleLike called', { 
            isLiked, 
            postId: post.id, 
            userId: session.user.id, 
            currentReactions: postReactions,
            isLoading: isReactionLoading 
        })

        try {
            if (isLiked) {
                console.log('Removing reaction...')
                const result = await dispatch(removeReaction({ postId: post.id, type: 'LIKE', userId: session.user.id }))
                console.log('Remove reaction result:', result)
                if (removeReaction.rejected.match(result)) {
                    throw new Error(result.error.message || 'Failed to remove reaction')
                }
            } else {
                console.log('Adding reaction...')
                const result = await dispatch(addReaction({ postId: post.id, type: 'LIKE' }))
                console.log('Add reaction result:', result)
                if (addReaction.rejected.match(result)) {
                    throw new Error(result.error.message || 'Failed to add reaction')
                }
            }
        } catch (error) {
            console.error('Error updating reaction:', error)
            toast({
                title: "Error",
                description: "Failed to update reaction. Please try again.",
                variant: "destructive",
            })
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
                url: `${window.location.origin}/thread/${post.id}`
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
        if (!isReply && !isReplying) {
            router.push(`/thread/${post.id}`)
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

    const handleReplyFileSelect = (acceptedTypes: string) => {
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
                setReplyMediaFiles(prev => [...prev, ...files]);
            }
        };
        input.click();
    };

    // Navigate to parent post/reply
    const navigateToParent = () => {
        if (post.parent) {
            router.push(`/thread/${post.parent.id}`)
        }
    }

    // Build the "Replied to" text as JSX with clickable username
    const buildRepliedToText = () => {
        if (!post.parent) return null
        
        const parentUsername = post.parent.author.username || post.parent.author.name || 'unknown'
        
        return (
            <span>
                Replied to{' '}
                <span 
                    className="text-primary-500 hover:text-primary-600 cursor-pointer font-medium transition-colors"
                    onClick={(e) => {
                        e.stopPropagation()
                        navigateToParent()
                    }}
                >
                    @{parentUsername}
                </span>
            </span>
        )
    }

    const handleSubmitReply = async () => {
        if (!replyContent.trim() && replyMediaFiles.length === 0) {
            toast({
                title: "Error",
                description: "Please write something or add media to reply",
                variant: "destructive",
            });
            return;
        }

        setIsSubmittingReply(true);
        try {
            const formData = new FormData();
            formData.append('content', replyContent);
            formData.append('parentId', post.id);
            
            replyMediaFiles.forEach(file => {
                formData.append('mediaAttachments', file);
            });

            const response = await fetch('/api/posts', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to submit reply');
            }

            toast({
                title: "Success",
                description: "Reply posted successfully!",
            });

            // Reset reply form
            setReplyContent('');
            setReplyMediaFiles([]);
            setIsReplying(false);
            onUpdate(); // Refresh the parent component
        } catch (error: any) {
            console.error('Error submitting reply:', error);
            toast({
                title: "Error",
                description: error.message || "Failed to submit reply. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSubmittingReply(false);
        }
    };

    useEffect(() => {
        if (showLikes) {
            fetchLikedUsers()
        }
    }, [showLikes, post.id])

    useEffect(() => {
        if (isReplying && replyTextareaRef.current) {
            replyTextareaRef.current.focus()
        }
    }, [isReplying])

    return (
        <Card className={`${isReply ? 'mt-4' : 'mb-8'} glass-card shadow-lg hover:shadow-xl transition-all duration-300`}>
            <CardHeader className="pb-3">
                {/* Replied to indicator */}
                {post.parent && !hideRepliedTo && (
                    <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                        <ChevronRight className="h-3 w-3" />
                        {buildRepliedToText()}
                    </div>
                )}
                
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Avatar className="h-10 w-10 cursor-pointer border-2 border-glass-border dark:border-glass-border-dark" onClick={() => router.push(`/profile/${post.author.id}`)}>
                            <AvatarImage src={post.author.image || undefined} alt={post.author.name || 'User'} />
                            <AvatarFallback className="bg-primary-500/20 text-primary-500">{post.author.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-medium cursor-pointer text-black dark:text-white hover:text-primary-500 transition-colors" onClick={() => router.push(`/profile/${post.author.id}`)}>{post.author.name}</p>
                                {isEdited && (
                                    <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                                        edited
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-black/60 dark:text-white/60">{format(new Date(post.createdAt), 'MMM d, yyyy')}</p>
                        </div>
                    </div>
                    {isAuthor && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="glass-button h-10 w-10"
                                >
                                    <MoreHorizontal className="h-5 w-5 text-black/60 dark:text-white/60" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 glass-card">
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
                            className="min-h-[100px] mb-4 glass-input focus-ring"
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
                                            className="absolute top-2 right-2 h-6 w-6 rounded-full"
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
                                    className="glass-button"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleEdit}
                                    className="primary-button"
                                >
                                    Save Changes
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div 
                        className="cursor-pointer"
                        onClick={navigateToPost}
                    >
                        <p className="text-black dark:text-white">
                            {showFullContent ? post.content : post.content.slice(0, 280)}
                            {!showFullContent && post.content.length > 280 && (
                                <>
                                    ...{' '}
                                    <Button
                                        variant="link"
                                        className="p-0 h-auto text-primary-500 hover:text-primary-600"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            router.push(`/thread/${post.id}`)
                                        }}
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
                                                className={`w-full h-full ${post.mediaAttachments?.length === 1 ? 'object-contain' : 'object-cover'} rounded-2xl`}
                                            />
                                        ) : url.match(/\.(mp4|webm|ogg)$/i) && (
                                            <video
                                                src={url}
                                                className={`w-full h-full ${post.mediaAttachments?.length === 1 ? 'object-contain' : 'object-cover'} rounded-lg`}
                                                controls
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
            
            <CardFooter className="flex justify-between border-t border-glass-border dark:border-glass-border-dark mt-4 pt-4">
                <Sheet>
                    <div className="flex items-center space-x-1">
                        <Button
                            variant="ghost"
                            onClick={handleLike}
                            className={`glass-button flex items-center space-x-2 transition-all duration-200 ${
                                post.reactions.some(r => r.userId === session?.user?.id && r.type === 'LIKE') 
                                    ? 'text-primary-500 bg-primary-500/10' 
                                    : 'text-black/60 dark:text-white/60'
                            }`}
                        >
                            <ThumbsUp className={`h-5 w-5 ${
                                post.reactions.some(r => r.userId === session?.user?.id && r.type === 'LIKE') 
                                    ? 'fill-current' 
                                    : ''
                            }`} />
                            <span>
                                {post._count.reactions || post.reactions.filter(r => r.type === 'LIKE').length}
                            </span>
                        </Button>
                        {(post._count.reactions || post.reactions.filter(r => r.type === 'LIKE').length) > 0 && (
                            <SheetTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="glass-button p-2"
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
                        className="p-0 h-[85vh] sm:max-w-none rounded-t-[20px] glass-card"
                    >
                        <div className="p-6">
                            <div className="w-12 h-1.5 bg-black/20 dark:bg-white/20 rounded-full mx-auto mb-6" />
                            <SheetHeader>
                                <SheetTitle className="text-black dark:text-white">People who liked this</SheetTitle>
                            </SheetHeader>
                            <div className="mt-4 space-y-4 overflow-y-auto max-h-[calc(85vh-120px)]">
                                {isLoadingReactions ? (
                                    <div className="text-center py-4 text-sm text-black/60 dark:text-white/60">
                                        Loading...
                                    </div>
                                ) : reactionUsers.length > 0 ? (
                                    reactionUsers.map((user) => (
                                        <div key={user.id} className="flex items-center space-x-3">
                                            <Avatar className="border-2 border-glass-border dark:border-glass-border-dark">
                                                <AvatarImage src={user.image || undefined} />
                                                <AvatarFallback className="bg-primary-500/20 text-primary-500">{user.name?.[0]}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium text-sm text-black dark:text-white">{user.name}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-4 text-sm text-black/60 dark:text-white/60">
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
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsReplying(!isReplying);
                    }}
                    className={`glass-button flex items-center space-x-2 transition-all duration-200 ${
                        isReplying 
                            ? 'text-primary-500 bg-primary-500/10' 
                            : 'text-black/60 dark:text-white/60'
                    }`}
                >
                    <MessageSquare className={`h-4 w-4 ${isReplying ? 'fill-current' : ''}`} />
                    <span>{post._count.replies}</span>
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleShare}
                    className="glass-button flex items-center space-x-2 text-black/60 dark:text-white/60"
                >
                    <Share2 className="h-4 w-4" />
                </Button>
            </CardFooter>
            
            {/* Inline Reply Form */}
            {isReplying && (
                <div 
                    className="p-6 glass-card border-t border-glass-border dark:border-glass-border-dark bg-white/30 dark:bg-black/30 backdrop-blur-md"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-start space-x-4">
                        <Avatar className="h-10 w-10 border-2 border-glass-border dark:border-glass-border-dark">
                            <AvatarImage src={session?.user?.image || undefined} alt={session?.user?.name || 'You'} />
                            <AvatarFallback className="bg-primary-500/20 text-primary-500">{session?.user?.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-4">
                            <Textarea
                                ref={replyTextareaRef}
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                placeholder="Write your reply..."
                                className="min-h-[100px] glass-input focus-ring resize-none bg-white/50 dark:bg-black/50 backdrop-blur-sm border-glass-border dark:border-glass-border-dark"
                                disabled={isSubmittingReply}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                        e.preventDefault()
                                        if (!isSubmittingReply && (replyContent.trim() || replyMediaFiles.length > 0)) {
                                            handleSubmitReply()
                                        }
                                    }
                                }}
                            />
                            
                            {/* Reply Media Preview */}
                            {replyMediaFiles.length > 0 && (
                                <div className="grid grid-cols-2 gap-3">
                                    {replyMediaFiles.map((file, index) => (
                                        <div key={index} className="relative aspect-square glass-card p-2">
                                            {file.type.startsWith('image/') ? (
                                                <img
                                                    src={URL.createObjectURL(file)}
                                                    alt={`Reply media ${index + 1}`}
                                                    className="w-full h-full object-cover rounded-xl"
                                                />
                                            ) : file.type.startsWith('video/') && (
                                                <video
                                                    src={URL.createObjectURL(file)}
                                                    className="w-full h-full object-cover rounded-xl"
                                                    controls
                                                />
                                            )}
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-lg"
                                                onClick={() => setReplyMediaFiles(prev => prev.filter((_, i) => i !== index))}
                                                disabled={isSubmittingReply}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            <div className="flex justify-between items-center pt-2">
                                <div className="flex space-x-3">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="glass-button text-green-500 hover:bg-green-500/10 hover:text-green-600"
                                        onClick={() => handleReplyFileSelect('image/*')}
                                        disabled={isSubmittingReply}
                                    >
                                        <Image className="mr-2 h-4 w-4" />
                                        Photo
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="glass-button text-blue-500 hover:bg-blue-500/10 hover:text-blue-600"
                                        onClick={() => handleReplyFileSelect('video/*')}
                                        disabled={isSubmittingReply}
                                    >
                                        <Video className="mr-2 h-4 w-4" />
                                        Video
                                    </Button>
                                </div>
                                <div className="flex space-x-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setIsReplying(false)
                                            setReplyContent('')
                                            setReplyMediaFiles([])
                                        }}
                                        className="glass-button"
                                        disabled={isSubmittingReply}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleSubmitReply}
                                        size="sm"
                                        className="primary-button"
                                        disabled={isSubmittingReply || (!replyContent.trim() && replyMediaFiles.length === 0)}
                                        title="Cmd/Ctrl + Enter to post"
                                    >
                                        {isSubmittingReply ? 'Posting...' : 'Reply'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="glass-card">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-black dark:text-white">Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription className="text-black/60 dark:text-white/60">
                            This action cannot be undone. This will permanently delete your post
                            and remove all associated data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="glass-button">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                handleDelete()
                                setIsDeleteDialogOpen(false)
                            }}
                            className="bg-red-500 text-white hover:bg-red-600 rounded-2xl shadow-lg shadow-red-500/25"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    )
}