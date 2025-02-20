'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Session } from 'next-auth'
import { useInView } from 'react-intersection-observer'
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Image, Video, MoreHorizontal, Edit, Trash2, MessageSquare, Share2, X, ThumbsUp, ChevronRight } from 'lucide-react'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet'

interface Post {
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
    parentId?: string | null
    parent?: {
        id: string
        author: {
            id: string
            name: string | null
            image: string | null
        }
    } | null
}

interface FeedListProps {
    session: Session
    initialPosts?: Post[]
}

interface PostCardProps {
    post: Post
    session: Session
    onUpdate: () => void
    isReply?: boolean
}

function PostCard({ post, session, onUpdate, isReply = false }: PostCardProps) {
    const router = useRouter()
    const { toast } = useToast()
    const [isEditing, setIsEditing] = useState(false)
    const [editContent, setEditContent] = useState(post.content)
    const [keepMediaUrls, setKeepMediaUrls] = useState<string[]>(post.mediaAttachments || [])
    const [editMediaFiles, setEditMediaFiles] = useState<File[]>([])
    const [isDeleting, setIsDeleting] = useState(false)
    const [isLoadingReactions, setIsLoadingReactions] = useState(false)
    const [reactionUsers, setReactionUsers] = useState<Post['reactions']>([])

    const isAuthor = session.user?.id === post.author.id

    const handleEdit = async () => {
        if (!isAuthor) return

        try {
            const formData = new FormData()
            formData.append('content', editContent)
            formData.append('keepMediaUrls', keepMediaUrls.join(','))
            
            editMediaFiles.forEach(file => {
                formData.append('mediaAttachments', file)
            })

            const response = await fetch(`/api/posts/${post.id}`, {
                method: 'PATCH',
                body: formData,
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Failed to update post')
            }

            toast({ 
                title: "Success", 
                description: "Post updated successfully." 
            })
            setIsEditing(false)
            onUpdate()
        } catch (error: any) {
            console.error('Error updating post:', error)
            toast({
                title: "Error",
                description: error.message || "Failed to update post. Please try again.",
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
            setIsDeleting(false)
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

    const handleFileSelect = (acceptedTypes: string) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = acceptedTypes
        input.multiple = true
        input.onchange = (e: Event) => {
            const files = Array.from((e.target as HTMLInputElement).files || [])
            if (files.length > 0) {
                const invalidFiles = files.filter(file => file.size > 20 * 1024 * 1024)
                if (invalidFiles.length > 0) {
                    toast({
                        title: "Error",
                        description: "Files must be less than 20MB",
                        variant: "destructive",
                    })
                    return
                }
                setEditMediaFiles(prev => [...prev, ...files])
            }
        }
        input.click()
    }

    const handleReaction = async (type: string) => {
        const hasReaction = post.reactions.some(r => r.userId === session.user.id && r.type === type)
        
        try {
            const response = await fetch(`/api/posts/${post.id}/reactions${hasReaction ? `?type=${type}` : ''}`, {
                method: hasReaction ? 'DELETE' : 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: hasReaction ? undefined : JSON.stringify({ type })
            })

            if (!response.ok) {
                throw new Error('Failed to update reaction')
            }

            onUpdate()
        } catch (error) {
            console.error('Error updating reaction:', error)
            toast({
                title: "Error",
                description: "Failed to update reaction. Please try again.",
                variant: "destructive",
            })
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
            setReactionUsers(data.reactions)
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

    const handleLikeClick = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        handleReaction('LIKE')
    }

    return (
        <Card className="border-none bg-white dark:bg-slate-900 shadow-sm">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Avatar>
                            <AvatarImage src={post.author.image || undefined} />
                            <AvatarFallback>{post.author.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-medium">{post.author.name}</p>
                            <p className="text-sm text-slate-500">{new Date(post.createdAt).toLocaleString()}</p>
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
                                    onClick={() => setIsDeleting(true)}
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
                {post.parentId && post.parent && (
                    <div className="mb-4 italic text-sm text-slate-600 dark:text-slate-400">
                        Replied to{' '}
                        <Button
                            variant="link"
                            className="p-0 h-auto font-medium text-blue-600 dark:text-blue-400 hover:underline"
                            onClick={() => router.push(`/post/${post.parentId}`)}
                        >
                            @{post.parent.author.name}
                        </Button>
                    </div>
                )}
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
                        <p className="text-slate-800 dark:text-slate-200">{post.content}</p>
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
                        <div>
                            <Button
                                variant="ghost"
                                onClick={handleLikeClick}
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
                        </div>
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
                    </div>
                    <SheetContent side="right" className="like-sheet-content">
                        <SheetHeader>
                            <SheetTitle>Liked by</SheetTitle>
                        </SheetHeader>
                        <div className="mt-4 space-y-4">
                            {isLoadingReactions ? (
                                <div className="text-center py-4 text-sm text-slate-500">
                                    Loading...
                                </div>
                            ) : reactionUsers.length > 0 ? (
                                reactionUsers.map((reaction) => (
                                    <div key={reaction.id} className="flex items-center space-x-3">
                                        <Avatar>
                                            <AvatarImage src={reaction.user?.image || undefined} />
                                            <AvatarFallback>{reaction.user?.name?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium text-sm">{reaction.user?.name}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-4 text-sm text-slate-500">
                                    No likes yet
                                </div>
                            )}
                        </div>
                    </SheetContent>
                </Sheet>
                
                <Button
                    variant="ghost"
                    className="post-action-button"
                    onClick={() => router.push(`/post/${post.id}`)}
                >
                    <MessageSquare className="h-5 w-5" />
                    <span className="ml-2">{post._count.replies}</span>
                </Button>
                <Button
                    variant="ghost"
                    className="post-action-button"
                    onClick={() => {
                        navigator.share({
                            title: 'Share Post',
                            text: post.content,
                            url: `${window.location.origin}/post/${post.id}`
                        }).catch(error => {
                            if (error.name !== 'AbortError') {
                                toast({
                                    title: "Share failed",
                                    description: "Couldn't share the post. Try copying the link instead.",
                                    variant: "destructive",
                                });
                            }
                        });
                    }}
                >
                    <Share2 className="h-5 w-5" />
                </Button>
            </CardFooter>
            <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
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
                            onClick={handleDelete}
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

export default function FeedList({ session, initialPosts = [] }: FeedListProps) {
    const [posts, setPosts] = useState<Post[]>(initialPosts)
    const [nextCursor, setNextCursor] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const { ref, inView } = useInView()
    const [forceUpdateKey, setForceUpdateKey] = useState(0) // Add this line

    const fetchPosts = async (cursor?: string | null) => {
        try {
            setIsLoading(true)
            const url = `/api/posts${cursor ? `?cursor=${cursor}` : ''}`
            const response = await fetch(url)
            
            if (!response.ok) {
                throw new Error('Failed to fetch posts')
            }
            
            const data = await response.json()
            
            if (cursor) {
                setPosts(prev => [...prev, ...data.posts])
            } else {
                setPosts(data.posts)
            }
            
            setNextCursor(data.nextCursor)
        } catch (error) {
            console.error('Error fetching posts:', error)
        } finally {
            setIsLoading(false)
        }
    }

    // Add this method to refresh the feed
    const refreshFeed = () => {
        setForceUpdateKey(prev => prev + 1)
        fetchPosts()
    }

    useEffect(() => {
        // Initial load if no posts provided or when force update key changes
        if (initialPosts.length === 0 || forceUpdateKey > 0) {
            fetchPosts()
        }
    }, [initialPosts.length, forceUpdateKey])

    useEffect(() => {
        // Load more posts when scrolling to bottom
        if (inView && nextCursor && !isLoading) {
            fetchPosts(nextCursor)
        }
    }, [inView, nextCursor, isLoading])

    const handlePostUpdate = () => {
        // Fetch fresh data from the beginning
        fetchPosts()
    }

    if (!posts.length && !isLoading) {
        return (
            <div className="text-center py-10">
                <p className="text-gray-500">No posts yet. Be the first to post!</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {posts.map((post) => (
                <PostCard
                    key={post.id}
                    post={post}
                    session={session}
                    onUpdate={handlePostUpdate}
                />
            ))}
            {isLoading && (
                <div className="text-center py-4">
                    <p className="text-gray-500">Loading more posts...</p>
                </div>
            )}
            <div ref={ref} className="h-[10px]" />
        </div>
    )
}
