'use client'

import { useState, useRef, useEffect } from 'react'
import { Session } from 'next-auth'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { IconMessage, IconThumbUp, IconShare, IconDots, IconEdit, IconTrash, IconChevronRight, IconPhoto, IconVideo, IconX, IconMinus, IconPlus } from '@tabler/icons-react'
import { format } from 'date-fns'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

export interface ThreadReplyProps {
    reply: {
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
        replies?: any[]
    }
    session: Session
    onUpdate: () => void
    depth?: number
    maxDepth?: number
    parentAuthors?: string[]
}

export default function ThreadReply({ 
    reply, 
    session, 
    onUpdate, 
    depth = 0, 
    maxDepth = 3,
    parentAuthors = []
}: ThreadReplyProps) {
    const router = useRouter()
    const { toast } = useToast()
    const [isUpdating, setIsUpdating] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [isLoadingReactions, setIsLoadingReactions] = useState(false)
    const [reactionUsers, setReactionUsers] = useState<Array<{
        id: string
        name: string | null
        image: string | null
    }>>([])
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [editContent, setEditContent] = useState(reply.content)
    const [keepMediaUrls, setKeepMediaUrls] = useState<string[]>(reply.mediaAttachments || [])
    const [editMediaFiles, setEditMediaFiles] = useState<File[]>([])
    const [isReplying, setIsReplying] = useState(false)
    const [replyContent, setReplyContent] = useState('')
    const [replyMediaFiles, setReplyMediaFiles] = useState<File[]>([])
    const [isSubmittingReply, setIsSubmittingReply] = useState(false)
    const [isExpanded, setIsExpanded] = useState(true)
    const [showReadMore, setShowReadMore] = useState(false)
    const [isContentExpanded, setIsContentExpanded] = useState(false)
    const [localReactions, setLocalReactions] = useState(reply.reactions || [])
    const replyTextareaRef = useRef<HTMLTextAreaElement>(null)

    const isAuthor = session?.user?.id === reply.author.id
    const isLiked = localReactions.some(r => r.userId === session?.user?.id && r.type === 'LIKE')
    const likeCount = localReactions.filter(r => r.type === 'LIKE').length
    const isEdited = new Date(reply.updatedAt) > new Date(reply.createdAt)

    // Character limit for read more functionality
    const CONTENT_LIMIT = 280

    // Sync local reactions with reply prop changes
    useEffect(() => {
        setLocalReactions(reply.reactions || [])
    }, [reply.reactions])

    // Check if content needs read more
    useEffect(() => {
        setShowReadMore(reply.content.length > CONTENT_LIMIT)
    }, [reply.content])

    // Navigate to parent post/reply
    const navigateToParent = () => {
        if (reply.parent) {
            router.push(`/thread/${reply.parent.id}`)
        }
    }

    // Build the "Replied to" text as JSX with clickable username
    const buildRepliedToText = () => {
        if (!reply.parent) return null
        
        const parentUsername = reply.parent.author.username || reply.parent.author.name || 'unknown'
        
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

    const handleLike = async () => {
        if (!session?.user?.id || isUpdating) return

        setIsUpdating(true)
        const currentLikeState = isLiked
        const currentCount = likeCount
        const currentReactions = [...localReactions]

        try {            
            // Optimistic update for reactions array
            if (currentLikeState) {
                // Remove reaction
                setLocalReactions(prev => prev.filter(r => !(r.userId === session.user.id && r.type === 'LIKE')))
            } else {
                // Add reaction
                setLocalReactions(prev => [...prev, {
                    id: `temp-${Date.now()}`,
                    type: 'LIKE',
                    userId: session.user.id,
                    user: {
                        id: session.user.id,
                        name: session.user.name || null,
                        image: session.user.image || null
                    }
                }])
            }

            const method = currentLikeState ? 'DELETE' : 'POST'
            const url = `/api/posts/${reply.id}/reactions${currentLikeState ? '?type=LIKE' : ''}`

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                ...(method === 'POST' && { body: JSON.stringify({ type: 'LIKE' }) })
            })

            if (!response.ok) {
                // Revert optimistic updates
                setLocalReactions(currentReactions)
                const errorData = await response.json()
                
                // Handle specific error cases more gracefully
                if (response.status === 400 && errorData.error?.includes('already reacted')) {
                    // If already reacted, just show a gentle message and don't throw error
                    toast({
                        title: "Already reacted",
                        description: "You have already reacted to this post.",
                    })
                    return
                }
                
                throw new Error(errorData.error || 'Failed to update reaction')
            }

            // Don't call onUpdate() to avoid losing nested replies structure
            // The optimistic update should be sufficient
            // onUpdate()
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
            setIsDeleting(true)
            const response = await fetch(`/api/posts/${reply.id}`, {
                method: 'DELETE',
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Failed to delete reply')
            }

            toast({ 
                title: "Success", 
                description: "Reply deleted successfully." 
            })
            onUpdate()
        } catch (error: any) {
            console.error('Error deleting reply:', error)
            toast({
                title: "Error",
                description: error.message || "Failed to delete reply. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsDeleting(false)
        }
    }

    const handleShare = async () => {
        try {
            await navigator.share({
                title: 'Share Reply',
                text: reply.content,
                url: `${window.location.origin}/thread/${reply.id}`
            })
        } catch (error) {
            if ((error as Error).name !== 'AbortError') {
                // Fallback: copy to clipboard
                try {
                    await navigator.clipboard.writeText(`${window.location.origin}/thread/${reply.id}`)
                    toast({
                        title: "Link copied",
                        description: "Reply link copied to clipboard",
                    })
                } catch (error) {
                    toast({
                        title: "Share failed",
                        description: "Couldn't share the reply. Please try again.",
                        variant: "destructive",
                    })
                }
            }
        }
    }

    const navigateToThread = () => {
        router.push(`/thread/${reply.id}`)
    }

    const loadReactions = async () => {
        try {
            setIsLoadingReactions(true)
            const response = await fetch(`/api/posts/${reply.id}/reactions`)
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
            
            // Add existing media URLs to keep
            keepMediaUrls.forEach(url => {
                formData.append('keepMediaUrls', url)
            })
            
            // Add new media files
            editMediaFiles.forEach(file => {
                formData.append('mediaAttachments', file);
            });

            const response = await fetch(`/api/posts/${reply.id}`, {
                method: 'PATCH',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to update reply');
            }

            toast({ 
                title: "Success", 
                description: "Reply updated successfully." 
            });
            setIsEditing(false);
            // Don't call onUpdate() for edits to avoid losing nested replies structure
            // onUpdate();
        } catch (error: any) {
            console.error('Error updating reply:', error);
            toast({
                title: "Error",
                description: error.message || "Failed to update reply. Please try again.",
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

    const handleSubmitReply = async () => {
        if (!replyContent.trim() && replyMediaFiles.length === 0) {
            toast({
                title: "Error",
                description: "Reply cannot be empty",
                variant: "destructive",
            });
            return;
        }

        setIsSubmittingReply(true);
        try {
            const formData = new FormData();
            formData.append('content', replyContent);
            formData.append('parentId', reply.id);

            replyMediaFiles.forEach(file => {
                formData.append('mediaAttachments', file);
            });

            const response = await fetch('/api/posts', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to post reply');
            }

            toast({ 
                title: "Success", 
                description: "Reply posted successfully!" 
            });
            
            setReplyContent('');
            setReplyMediaFiles([]);
            setIsReplying(false);
            onUpdate();
        } catch (error: any) {
            console.error('Error posting reply:', error);
            toast({
                title: "Error",
                description: error.message || "Failed to post reply. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSubmittingReply(false);
        }
    };

    useEffect(() => {
        if (isReplying && replyTextareaRef.current) {
            replyTextareaRef.current.focus()
        }
    }, [isReplying])

    // Truncate content for read more
    const displayContent = showReadMore && !isContentExpanded 
        ? reply.content.slice(0, CONTENT_LIMIT) + '...'
        : reply.content;

    return (
        <div className="relative flex">
            {/* Thread line with collapse/expand button */}
            {depth > 0 && (
                <div className="flex flex-col items-center mr-4 pt-2">
                    {/* Vertical line */}
                    <div className="w-0.5 bg-glass-border dark:bg-glass-border-dark flex-1 min-h-[40px]" />
                    
                    {/* Collapse/Expand circle button */}
                    {reply.replies && reply.replies.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="w-6 h-6 rounded-full glass-button flex items-center justify-center p-0 mt-2 mb-2 border border-glass-border dark:border-glass-border-dark"
                        >
                            {isExpanded ? 
                                <IconMinus className="h-3 w-3 text-black/60 dark:text-white/60" /> : 
                                <IconPlus className="h-3 w-3 text-black/60 dark:text-white/60" />
                            }
                        </Button>
                    )}
                    
                    {/* Continue vertical line if there are more replies */}
                    {reply.replies && reply.replies.length > 0 && (
                        <div className="w-0.5 bg-glass-border dark:bg-glass-border-dark flex-1 min-h-[20px]" />
                    )}
                </div>
            )}
            
            {/* Main content */}
            <div className="flex-1">
                <Card className="mb-4 glass-card shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardHeader className="pb-3">
                        {/* Replied to indicator - only show for nested replies */}
                        {reply.parent && depth > 0 && (
                            <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                                <IconChevronRight className="h-3 w-3" />
                                {buildRepliedToText()}
                            </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <Avatar 
                                    className="h-10 w-10 cursor-pointer border-2 border-glass-border dark:border-glass-border-dark" 
                                    onClick={() => router.push(`/profile/${reply.author.id}`)}
                                >
                                    <AvatarImage src={reply.author.image || undefined} alt={reply.author.name || 'User'} />
                                    <AvatarFallback className="bg-primary-500/20 text-primary-500">{reply.author.name?.[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <p 
                                            className="text-sm font-medium cursor-pointer text-black dark:text-white hover:text-primary-500 transition-colors" 
                                            onClick={() => router.push(`/profile/${reply.author.id}`)}
                                        >
                                            {reply.author.name}
                                        </p>
                                        {isEdited && (
                                            <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                                                edited
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-black/60 dark:text-white/60">{format(new Date(reply.createdAt), 'MMM d, yyyy • h:mm a')}</p>
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
                                            <IconDots className="h-5 w-5 text-black/60 dark:text-white/60" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56 glass-card">
                                        <DropdownMenuItem
                                            onClick={() => setIsEditing(true)}
                                            className="action-dropdown-item"
                                        >
                                            <IconEdit className="mr-3 h-5 w-5" />
                                            Edit reply
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => setIsDeleteDialogOpen(true)}
                                            className="action-dropdown-item-delete"
                                        >
                                            <IconTrash className="mr-3 h-5 w-5" />
                                            Delete reply
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
                                                    <IconX className="h-4 w-4" />
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
                                                    <IconX className="h-4 w-4" />
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
                                            <IconPhoto className="mr-2 h-4 w-4" />
                                            Photo
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className="text-blue-500"
                                            onClick={() => handleFileSelect('video/*')}
                                        >
                                            <IconVideo className="mr-2 h-4 w-4" />
                                            Video
                                        </Button>
                                    </div>
                                    <div className="flex space-x-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setIsEditing(false)
                                                setEditContent(reply.content)
                                                setKeepMediaUrls(reply.mediaAttachments || [])
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
                            <>
                                <div className="text-black dark:text-white leading-relaxed">
                                    {displayContent}
                                    {showReadMore && (
                                        <button
                                            onClick={() => setIsContentExpanded(!isContentExpanded)}
                                            className="ml-2 text-primary-500 hover:text-primary-600 text-sm font-medium underline"
                                        >
                                            {isContentExpanded ? 'Read less' : 'Read more'}
                                        </button>
                                    )}
                                </div>
                                {reply.mediaAttachments && reply.mediaAttachments.length > 0 && (
                                    <div className={`mt-4 grid ${reply.mediaAttachments.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
                                        {reply.mediaAttachments.map((url, index) => (
                                            <div key={url} className={`relative ${reply.mediaAttachments?.length === 1 ? 'aspect-auto max-h-[512px]' : 'aspect-square'} rounded-xl overflow-hidden`}>
                                                {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                                    <img
                                                        src={url}
                                                        alt={`Media ${index + 1}`}
                                                        className={`w-full h-full ${reply.mediaAttachments?.length === 1 ? 'object-contain' : 'object-cover'} transition-transform hover:scale-105`}
                                                    />
                                                ) : url.match(/\.(mp4|webm|ogg)$/i) && (
                                                    <video
                                                        src={url}
                                                        className={`w-full h-full ${reply.mediaAttachments?.length === 1 ? 'object-contain' : 'object-cover'}`}
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
                    <CardFooter className="flex justify-between border-t border-glass-border dark:border-glass-border-dark mt-4 pt-4">
                        <Sheet>
                            <div className="flex items-center space-x-1">
                                <Button
                                    variant="ghost"
                                    onClick={handleLike}
                                    className={`glass-button flex items-center space-x-2 transition-all duration-200 ${
                                        isLiked 
                                            ? 'text-primary-500 bg-primary-500/10' 
                                            : 'text-black/60 dark:text-white/60'
                                    }`}
                                >
                                    <IconThumbUp className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
                                    <span>
                                        {likeCount}
                                    </span>
                                </Button>
                                {likeCount > 0 && (
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
                                            <IconChevronRight className="h-4 w-4" />
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
                            <IconMessage className={`h-4 w-4 ${isReplying ? 'fill-current' : ''}`} />
                            <span>{reply._count.replies}</span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleShare}
                            className="glass-button flex items-center space-x-2 text-black/60 dark:text-white/60"
                        >
                            <IconShare className="h-4 w-4" />
                        </Button>
                    </CardFooter>
                </Card>

                {/* Inline Reply Form */}
                {isReplying && (
                    <div 
                        className="mb-6 p-6 glass-card border border-glass-border dark:border-glass-border-dark bg-white/20 dark:bg-black/20 backdrop-blur-md rounded-2xl"
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
                                                    <IconX className="h-3 w-3" />
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
                                            <IconPhoto className="mr-2 h-4 w-4" />
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
                                            <IconVideo className="mr-2 h-4 w-4" />
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

                {/* Nested replies */}
                {reply.replies && reply.replies.length > 0 && depth < maxDepth && isExpanded && (
                    <div className="space-y-3">
                        {reply.replies.map((nestedReply: any, index) => (
                            <div key={nestedReply.id} className={`${index === (reply.replies?.length ?? 0) - 1 ? 'mb-0' : 'mb-3'}`}>
                                <ThreadReply
                                    reply={nestedReply}
                                    session={session}
                                    onUpdate={onUpdate}
                                    depth={depth + 1}
                                    maxDepth={maxDepth}
                                    parentAuthors={[...parentAuthors, reply.author.username || reply.author.name || 'unknown']}
                                />
                            </div>
                        ))}
                        {depth >= maxDepth - 1 && (reply.replies?.length ?? 0) > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={navigateToThread}
                                className="ml-6 text-primary-500 hover:text-primary-600 hover:bg-primary-500/10 glass-button"
                            >
                                View full thread →
                            </Button>
                        )}
                    </div>
                )}
            </div>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="glass-card">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-black dark:text-white">Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription className="text-black/60 dark:text-white/60">
                            This action cannot be undone. This will permanently delete your reply
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
        </div>
    )
}