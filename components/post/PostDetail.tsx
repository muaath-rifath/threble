'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { Image, Video, ThumbsUp, MessageSquare, Share2, X, Edit, MoreHorizontal, Trash2 } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { Session } from 'next-auth'
import { FileUpload } from "@/components/ui/file-upload"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

const replyFormSchema = z.object({
    content: z.string().min(1, "Reply cannot be empty"),
});

interface Reaction {
    id: string;
    type: string;
    userId: string;
    postId: string;
    createdAt: string;
    commentId: string | null;
}

type ExtendedPost = {
    id: string;
    content: string;
    author: {
        name: string | null;
        image: string | null;
    };
    createdAt: string;
    reactions: Reaction[];
    _count: {
        replies: number;
    };
    parentId: string | null;
    parent: {
        author: {
            name: string | null;
            image: string | null;
        };
    } | null;
    replies: ExtendedPost[];
    mediaAttachments: string[];
};

interface PostDetailProps {
    initialPost: ExtendedPost;
    session: Session;
}

interface MediaContentProps {
    mediaAttachments: string[];
    className?: string;
}

function MediaContent({ mediaAttachments, className = "" }: MediaContentProps) {
    const [loadingStates, setLoadingStates] = useState<{ [key: string]: boolean }>({});
    const [errorStates, setErrorStates] = useState<{ [key: string]: boolean }>({});
    const [mediaUrls, setMediaUrls] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        setLoadingStates({});
        setErrorStates({});
        setMediaUrls({});
    }, [mediaAttachments]);

    if (!mediaAttachments?.length) return null;

    return (
        <div className={`mt-4 grid grid-cols-${mediaAttachments.length === 1 ? '1' : '2'} gap-2 ${className}`}>
            {mediaAttachments.map((url, index) => {
                const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                const isVideo = url.match(/\.(mp4|webm|ogg)$/i);
                const mediaUrl = mediaUrls[url] || url;

                if (isImage) {
                    return (
                        <div key={url} className={`relative bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden ${
                            mediaAttachments.length === 1 ? 'aspect-auto max-h-[512px]' : 'aspect-square'
                        }`}>
                            <img
                                src={mediaUrl}
                                alt={`Media ${index + 1}`}
                                className={`w-full h-full ${
                                    mediaAttachments.length === 1 ? 'object-contain' : 'object-cover'
                                }`}
                                loading="lazy"
                            />
                        </div>
                    );
                }

                if (isVideo) {
                    return (
                        <div key={url} className={`relative bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden ${
                            mediaAttachments.length === 1 ? 'aspect-video' : 'aspect-square'
                        }`}>
                            <video
                                src={mediaUrl}
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
    );
}

export default function PostDetail({ initialPost, session }: PostDetailProps) {
    const router = useRouter()
    const { toast } = useToast()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [post, setPost] = useState<ExtendedPost>(initialPost)
    const [mediaFiles, setMediaFiles] = useState<File[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(initialPost.content);
    const [editMediaFiles, setEditMediaFiles] = useState<File[]>([]);
    const [keepMediaUrls, setKeepMediaUrls] = useState<string[]>(initialPost.mediaAttachments || []);
    const [postToDelete, setPostToDelete] = useState<string | null>(null);

    const replyForm = useForm<z.infer<typeof replyFormSchema>>({
        resolver: zodResolver(replyFormSchema),
        defaultValues: { content: '' },
    })

    const fetchPost = async () => {
        try {
            const response = await fetch(`/api/posts/${post.id}`)
            if (response.ok) {
                const data = await response.json()
                setPost(data)
            }
        } catch (error) {
            console.error('Error fetching post:', error)
        }
    }

    const handleReaction = async (postId: string, type: string) => {
        if (!session?.user?.id) return;

        const targetPost = postId === post.id ? post : post.replies.find(r => r.id === postId);
        if (!targetPost) return;

        const hasReaction = targetPost.reactions.some(
            r => r.userId === session.user.id && r.type === type
        );

        // Create a temporary reaction for optimistic update
        const tempReaction: Reaction = {
            id: 'temp',
            type,
            userId: session.user.id,
            postId,
            createdAt: new Date().toISOString(),
            commentId: null
        };

        // Optimistically update the UI
        if (postId === post.id) {
            setPost({
                ...post,
                reactions: hasReaction
                    ? post.reactions.filter(r => !(r.userId === session.user.id && r.type === type))
                    : [...post.reactions, tempReaction]
            });
        } else {
            setPost({
                ...post,
                replies: post.replies.map(reply => {
                    if (reply.id === postId) {
                        return {
                            ...reply,
                            reactions: hasReaction
                                ? reply.reactions.filter(r => !(r.userId === session.user.id && r.type === type))
                                : [...reply.reactions, tempReaction]
                        };
                    }
                    return reply;
                })
            });
        }

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
            // Revert the optimistic update on error
            fetchPost();
            console.error('Error updating reaction:', error);
            toast({
                title: "Error",
                description: "Failed to update reaction. Please try again.",
                variant: "destructive",
            });
        }
    };

    const handleDeletePost = () => {
        setPostToDelete(post.id);
    };

    const handleDeleteConfirmed = async () => {
        if (!postToDelete) return;

        try {
            const response = await fetch(`/api/posts/${post.id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                toast({ 
                    title: "Success", 
                    description: "Post deleted successfully." 
                });
                router.push('/'); // Redirect to home page after deletion
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

    const handleFileSelect = (acceptedTypes: string) => {
        if (fileInputRef.current) {
            fileInputRef.current.accept = acceptedTypes
            fileInputRef.current.click()
        }
    }

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || [])
        if (files.length > 0) {
            // Validate file size (20MB max)
            const invalidFiles = files.filter(file => file.size > 20 * 1024 * 1024)
            if (invalidFiles.length > 0) {
                toast({
                    title: "Error",
                    description: "Files must be less than 20MB",
                    variant: "destructive",
                })
                return
            }
            setMediaFiles(prev => [...prev, ...files])
        }
    }

    const onSubmitReply = async (values: z.infer<typeof replyFormSchema>) => {
        setIsSubmitting(true)
        try {
            const formData = new FormData()
            formData.append('content', values.content)
            formData.append('visibility', 'public')
            formData.append('parentId', post.id)

            mediaFiles.forEach(file => {
                formData.append('mediaAttachments', file)
            })

            const response = await fetch('/api/posts', {
                method: 'POST',
                body: formData,
            })

            if (response.ok) {
                toast({ 
                    title: "Reply posted", 
                    description: "Your reply has been successfully posted." 
                })
                replyForm.reset()
                setMediaFiles([])
                fetchPost()
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to post reply. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleEditSubmit = async () => {
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

            if (response.ok) {
                const updatedPost = await response.json();
                setPost(updatedPost);
                setIsEditing(false);
                toast({ 
                    title: "Success", 
                    description: "Post updated successfully." 
                });
            } else {
                throw new Error('Failed to update post');
            }
        } catch (error) {
            console.error('Error updating post:', error);
            toast({
                title: "Error",
                description: "Failed to update post. Please try again.",
                variant: "destructive",
            });
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditContent(post.content);
        setKeepMediaUrls(post.mediaAttachments || []);
        setEditMediaFiles([]);
    };

    const handleRemoveMedia = (url: string) => {
        setKeepMediaUrls(prev => prev.filter(u => u !== url));
    };

    const handleShare = async (postId: string) => {
        try {
            const targetPost = postId === post.id ? post : post.replies.find(r => r.id === postId);
            if (!targetPost) return;

            await navigator.share({
                title: 'Share Post',
                text: targetPost.content,
                url: `${window.location.origin}/post/${postId}`
            });
        } catch (error) {
            if ((error as Error).name !== 'AbortError') {
                // Only show error if it's not user cancellation
                toast({
                    title: "Share failed",
                    description: "Couldn't share the post. Try copying the link instead.",
                    variant: "destructive",
                });
            }
        }
    };

    return (
        <div className="max-w-2xl mx-auto mt-8">
            <Card className="mb-8 border-none bg-white dark:bg-slate-900 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={post.author.image || undefined} />
                                <AvatarFallback>{post.author.name?.charAt(0) || '?'}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold text-slate-900 dark:text-slate-100">{post.author.name}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{new Date(post.createdAt).toLocaleString()}</p>
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
                                        <MoreHorizontal className="h-5 w-5 text-slate-500" />
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
                                        onClick={handleDeletePost}
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
                    <MediaContent mediaAttachments={post.mediaAttachments} />
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
                        {post.reactions.filter(r => r.type === 'LIKE').length}
                    </Button>
                    <Button
                        variant="ghost"
                        className="post-action-button"
                    >
                        <MessageSquare className="h-5 w-5" />
                        {post._count.replies}
                    </Button>
                    <Button 
                        variant="ghost"
                        className="post-action-button"
                        onClick={() => handleShare(post.id)}
                    >
                        <Share2 className="h-5 w-5" />
                        Share
                    </Button>
                </CardFooter>
            </Card>

            {/* Reply Form */}
            <Card className="mt-8 border-none bg-white dark:bg-slate-900 shadow-sm">
                <CardContent className="p-6">
                    <Form {...replyForm}>
                        <form onSubmit={replyForm.handleSubmit(onSubmitReply)} className="space-y-4">
                            <div className="flex items-start space-x-4">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={session.user.image || undefined} />
                                    <AvatarFallback>{session.user.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <FormField
                                    control={replyForm.control}
                                    name="content"
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormControl>
                                                <Textarea
                                                    {...field}
                                                    placeholder="Add your reply..."
                                                    className="min-h-[100px] resize-none bg-slate-50 dark:bg-slate-800 border-none"
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>
                            {mediaFiles.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 pl-14">
                                    {mediaFiles.map((file, index) => (
                                        <div key={index} className="relative aspect-square">
                                            {file.type.startsWith('image/') ? (
                                                <img
                                                    src={URL.createObjectURL(file)}
                                                    alt={`Preview ${index}`}
                                                    className="rounded-lg w-full h-full object-cover"
                                                />
                                            ) : file.type.startsWith('video/') && (
                                                <video
                                                    src={URL.createObjectURL(file)}
                                                    className="rounded-lg w-full h-full object-cover"
                                                    controls
                                                />
                                            )}
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full"
                                                onClick={() => setMediaFiles(files => files.filter((_, i) => i !== index))}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="flex justify-between items-center pl-14">
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
                                <Button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    className="bg-blue-500 hover:bg-blue-600 text-white"
                                >
                                    {isSubmitting ? 'Replying...' : 'Reply'}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <div className="mt-8 space-y-6">
                {post.replies.map((reply) => (
                    <Card key={reply.id} className="border-none bg-white dark:bg-slate-900 shadow-sm">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={reply.author.image || undefined} />
                                        <AvatarFallback>{reply.author.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-slate-100">{reply.author.name}</p>
                                        <p className="text-sm text-slate-500">{new Date(reply.createdAt).toLocaleString()}</p>
                                    </div>
                                </div>
                                {reply.author.name === session?.user.name && (
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
                                                onClick={() => router.push(`/post/${reply.id}/edit`)}
                                                className="action-dropdown-item"
                                            >
                                                <Edit className="mr-3 h-5 w-5" />
                                                Edit post
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => setPostToDelete(reply.id)}
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
                        <CardContent className="pt-2">
                            <p className="text-slate-800 dark:text-slate-200">{reply.content}</p>
                            <MediaContent mediaAttachments={reply.mediaAttachments} />
                        </CardContent>
                        <CardFooter className="flex justify-between border-t border-slate-100 dark:border-slate-800 mt-4 pt-4">
                            <Button
                                variant="ghost"
                                onClick={() => handleReaction(reply.id, 'LIKE')}
                                className={`post-action-button ${
                                    reply.reactions.some(r => r.userId === session.user.id && r.type === 'LIKE') 
                                        ? 'post-action-button-active' 
                                        : ''
                                }`}
                            >
                                <ThumbsUp className="h-5 w-5" />
                                {reply.reactions.filter(r => r.type === 'LIKE').length}
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => router.push(`/post/${reply.id}`)}
                                className="post-action-button"
                            >
                                <MessageSquare className="h-5 w-5" />
                                {reply._count.replies}
                            </Button>
                            <Button 
                                variant="ghost"
                                onClick={() => handleShare(reply.id)}
                                className="post-action-button"
                            >
                                <Share2 className="h-5 w-5" />
                                Share
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

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

            <Separator className="my-8" />
        </div>
    )
}