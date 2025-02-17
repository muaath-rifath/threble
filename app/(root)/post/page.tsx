'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ThumbsUp, MessageSquare, Share2, MoreVertical, Edit, Trash2 } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { ExtendedPost } from '@/lib/types'

export default function UserPostPage() {
    const { data: session } = useSession()
    const router = useRouter()
    const { toast } = useToast()
    const [posts, setPosts] = useState<ExtendedPost[]>([])
    const [postToDelete, setPostToDelete] = useState<string | null>(null)

    useEffect(() => {
        if (session) {
            fetchUserPosts()
        }
    }, [session])

    const fetchUserPosts = async () => {
        try {
            const response = await fetch('/api/posts/user')
            if (response.ok) {
                const data = await response.json()
                const transformedPosts = data.posts.map((post: any) => ({
                    ...post,
                    createdAt: new Date(post.createdAt).toISOString(),
                    reactions: post.reactions.map((r: any) => ({
                        ...r,
                        createdAt: new Date(r.createdAt).toISOString()
                    })),
                    _count: post._count || { replies: 0 }
                }));
                setPosts(transformedPosts);
            } else {
                console.error('Failed to fetch user posts:', response.statusText)
            }
        } catch (error) {
            console.error('Error fetching user posts:', error)
        }
    }

    const handleReaction = async (postId: string, type: string) => {
        if (!session?.user?.id) return;
        const targetPost = posts.find(p => p.id === postId);
        if (!targetPost) return;

        const hasReaction = targetPost.reactions.some(
            r => r.userId === session.user.id && r.type === type
        );

        // Create a temporary reaction for optimistic update
        const tempReaction = {
            id: 'temp',
            type,
            userId: session.user.id,
            postId,
            createdAt: new Date().toISOString(),
            commentId: null
        };

        // Optimistically update the UI
        setPosts(posts.map(post => {
            if (post.id === postId) {
                return {
                    ...post,
                    reactions: hasReaction
                        ? post.reactions.filter(r => !(r.userId === session.user.id && r.type === type))
                        : [...post.reactions, tempReaction]
                };
            }
            return post;
        }));

        try {
            const response = await fetch(`/api/posts/${postId}/reactions`, {
                method: hasReaction ? 'DELETE' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type }),
            });

            if (!response.ok) {
                throw new Error('Failed to update reaction');
            }
        } catch (error) {
            fetchUserPosts(); // Revert on error
            console.error('Error updating reaction:', error);
            toast({
                title: "Error",
                description: "Failed to update reaction. Please try again.",
                variant: "destructive",
            });
        }
    }

    const handleShare = async (postId: string) => {
        try {
            const targetPost = posts.find(p => p.id === postId);
            if (!targetPost) return;

            await navigator.share({
                title: 'Share Post',
                text: targetPost.content,
                url: `${window.location.origin}/post/${postId}`
            });
        } catch (error) {
            if ((error as Error).name !== 'AbortError') {
                toast({
                    title: "Share failed",
                    description: "Couldn't share the post. Try copying the link instead.",
                    variant: "destructive",
                });
            }
        }
    }

    const handleDeletePost = (postId: string) => {
        setPostToDelete(postId);
    };

    const handleDeleteConfirmed = async () => {
        if (!postToDelete) return;
        try {
            const response = await fetch(`/api/posts/${postToDelete}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                toast({ 
                    title: "Success", 
                    description: "Post deleted successfully." 
                });
                fetchUserPosts();
            } else {
                throw new Error('Failed to delete post');
            }
        } catch (error) {
            console.error('Error deleting post:', error);
            toast({
                title: "Error",
                description: "Failed to delete post. Please try again.",
                variant: "destructive",
            });
        } finally {
            setPostToDelete(null);
        }
    };

    if (!session) {
        return <div className="text-center mt-8">Please sign in to view your posts.</div>
    }

    return (
        <div className="max-w-2xl mx-auto mt-8">
            <h1 className="text-2xl font-bold mb-6">Your Posts</h1>
            {posts.map((post) => (
                <Card key={post.id} className="mb-8 border-none bg-white dark:bg-slate-900 shadow-sm">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={post.author.image || undefined} />
                                    <AvatarFallback>{post.author.name?.charAt(0) || '?'}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold text-slate-900 dark:text-slate-100">{post.author.name}</p>
                                    <p className="text-sm text-slate-500">{new Date(post.createdAt).toLocaleString()}</p>
                                </div>
                            </div>
                            {post.author.name === session?.user.name && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button 
                                            variant="ghost" 
                                            size="icon"
                                            className="hover:bg-slate-100 dark:hover:bg-slate-800 h-10 w-10"
                                        >
                                            <MoreVertical className="h-5 w-5 text-slate-500" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56">
                                        <DropdownMenuItem
                                            onClick={() => router.push(`/post/${post.id}/edit`)}
                                            className="action-dropdown-item"
                                        >
                                            <Edit className="mr-3 h-5 w-5" />
                                            Edit post
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => setPostToDelete(post.id)}
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
                                <button
                                    onClick={() => router.push(`/post/${post.parentId}`)}
                                    className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                    @{post.parent.author.name}
                                </button>
                            </div>
                        )}
                        <p className="text-slate-800 dark:text-slate-200">{post.content}</p>
                        {post.mediaAttachments && post.mediaAttachments.length > 0 && (
                            <div className={`mt-4 grid grid-cols-${post.mediaAttachments.length === 1 ? '1' : '2'} gap-2`}>
                                {post.mediaAttachments.map((url, index) => {
                                    const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                                    const isVideo = url.match(/\.(mp4|webm|ogg)$/i);

                                    if (isImage) {
                                        return (
                                            <div key={url} className={`relative bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden ${
                                                post.mediaAttachments.length === 1 ? 'aspect-auto max-h-[512px]' : 'aspect-square'
                                            }`}>
                                                <img
                                                    src={url}
                                                    alt={`Media ${index + 1}`}
                                                    className={`w-full h-full ${
                                                        post.mediaAttachments.length === 1 ? 'object-contain' : 'object-cover'
                                                    }`}
                                                    loading="lazy"
                                                />
                                            </div>
                                        );
                                    }

                                    if (isVideo) {
                                        return (
                                            <div key={url} className={`relative bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden ${
                                                post.mediaAttachments.length === 1 ? 'aspect-video' : 'aspect-square'
                                            }`}>
                                                <video
                                                    src={url}
                                                    className="w-full h-full object-cover"
                                                    controls
                                                    preload="metadata"
                                                />
                                            </div>
                                        );
                                    }

                                    return null;
                                })}
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-between border-t border-slate-100 dark:border-slate-800 mt-4 pt-4">
                        <Button
                            variant="ghost"
                            onClick={() => handleReaction(post.id, 'LIKE')}
                            className={`post-action-button ${
                                post.reactions.some(r => r.userId === session.user.id && r.type === 'LIKE') 
                                    ? 'post-action-button-active' 
                                    : ''
                            }`}
                        >
                            <ThumbsUp className="h-5 w-5" />
                            Like
                            <span className="ml-1">({post.reactions.filter(r => r.type === 'LIKE').length})</span>
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => router.push(`/post/${post.id}`)}
                            className="post-action-button"
                        >
                            <MessageSquare className="h-5 w-5" />
                            Reply
                            <span className="ml-1">({post._count.replies})</span>
                        </Button>
                        <Button 
                            variant="ghost"
                            onClick={() => handleShare(post.id)}
                            className="post-action-button"
                        >
                            <Share2 className="h-5 w-5" />
                            Share
                        </Button>
                    </CardFooter>
                </Card>
            ))}

            <AlertDialog open={!!postToDelete} onOpenChange={() => setPostToDelete(null)}>
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
                            onClick={handleDeleteConfirmed}
                            className="bg-red-600 text-white hover:bg-red-700"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
