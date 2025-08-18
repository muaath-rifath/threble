'use client'

import { useState } from 'react'
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
    const [likeCount, setLikeCount] = useState(reply.reactions.filter(r => r.type === 'LIKE').length)
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

    const isAuthor = session?.user?.id === reply.author.id
    const isLiked = reply.reactions.some(r => r.userId === session?.user?.id && r.type === 'LIKE')
    const isEdited = new Date(reply.updatedAt) > new Date(reply.createdAt)

    // Build the "Replied to" text
    const buildRepliedToText = () => {
        if (!reply.parent) return null
        
        const allAuthors = [...parentAuthors, reply.parent.author.username || reply.parent.author.name || 'unknown']
        const uniqueAuthors = Array.from(new Set(allAuthors))
        
        if (uniqueAuthors.length === 1) {
            return `Replied to @${uniqueAuthors[0]}`
        } else if (uniqueAuthors.length === 2) {
            return `Replied to @${uniqueAuthors[0]} and @${uniqueAuthors[1]}`
        } else {
            return `Replied to @${uniqueAuthors[0]}, @${uniqueAuthors[1]} and ${uniqueAuthors.length - 2} other${uniqueAuthors.length - 2 > 1 ? 's' : ''}`
        }
    }

    const handleLike = async () => {
        if (!session?.user?.id || isUpdating) return

        setIsUpdating(true)
        const currentLikeState = isLiked
        const currentCount = likeCount

        try {
            // Optimistic update
            setLikeCount(prev => currentLikeState ? prev - 1 : prev + 1)

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
            onUpdate();
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

    // Calculate indentation based on depth
    const indentClass = depth > 0 ? `ml-${Math.min(depth * 4, 16)}` : ''

    return (
        <div className={`${indentClass} ${depth > 0 ? 'border-l-2 border-glass-border dark:border-glass-border-dark pl-4' : ''}`}>
            <Card className="mb-4 glass-card shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-3">
                    {/* Replied to indicator */}
                    {buildRepliedToText() && (
                        <div className="text-xs text-gray-500 mb-2">
                            {buildRepliedToText()}
                        </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <Avatar className="h-10 w-10 cursor-pointer border-2 border-glass-border dark:border-glass-border-dark" onClick={() => router.push(`/profile/${reply.author.id}`)}>
                                <AvatarImage src={reply.author.image || undefined} alt={reply.author.name || 'User'} />
                                <AvatarFallback className="bg-primary-500/20 text-primary-500">{reply.author.name?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium cursor-pointer text-black dark:text-white hover:text-primary-500 transition-colors" onClick={() => router.push(`/profile/${reply.author.id}`)}>
                                        {reply.author.name}
                                    </p>
                                    {isEdited && (
                                        <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                                            edited
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-black/60 dark:text-white/60">{format(new Date(reply.createdAt), 'MMM d, yyyy')}</p>
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
                                        Edit reply
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => setIsDeleteDialogOpen(true)}
                                        className="action-dropdown-item-delete"
                                    >
                                        <Trash2 className="mr-3 h-5 w-5" />
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
                            <p className="text-black dark:text-white">
                                {reply.content}
                            </p>
                            {reply.mediaAttachments && reply.mediaAttachments.length > 0 && (
                                <div className={`mt-4 grid ${reply.mediaAttachments.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
                                    {reply.mediaAttachments.map((url, index) => (
                                        <div key={url} className={`relative ${reply.mediaAttachments?.length === 1 ? 'aspect-auto max-h-[512px]' : 'aspect-square'}`}>
                                            {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                                <img
                                                    src={url}
                                                    alt={`Media ${index + 1}`}
                                                    className={`w-full h-full ${reply.mediaAttachments?.length === 1 ? 'object-contain' : 'object-cover'} rounded-2xl`}
                                                />
                                            ) : url.match(/\.(mp4|webm|ogg)$/i) && (
                                                <video
                                                    src={url}
                                                    className={`w-full h-full ${reply.mediaAttachments?.length === 1 ? 'object-contain' : 'object-cover'} rounded-lg`}
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
                                <ThumbsUp className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
                                <span>
                                    {reply._count.reactions || reply.reactions.filter(r => r.type === 'LIKE').length}
                                </span>
                            </Button>
                            {(reply._count.reactions || reply.reactions.filter(r => r.type === 'LIKE').length) > 0 && (
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
                        onClick={navigateToThread}
                        className="glass-button flex items-center space-x-2 text-black/60 dark:text-white/60"
                    >
                        <MessageSquare className="h-4 w-4" />
                        <span>{reply._count.replies}</span>
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
            </Card>

            {/* Nested replies */}
            {reply.replies && reply.replies.length > 0 && depth < maxDepth && (
                <div className="space-y-2">
                    {reply.replies.map((nestedReply: any) => (
                        <ThreadReply
                            key={nestedReply.id}
                            reply={nestedReply}
                            session={session}
                            onUpdate={onUpdate}
                            depth={depth + 1}
                            maxDepth={maxDepth}
                            parentAuthors={[...parentAuthors, reply.author.username || reply.author.name || 'unknown']}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
