'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
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
import { Image, Video, Smile, ThumbsUp, MessageSquare, Share2, X, MoreHorizontal, Edit, Trash2 } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"

const postFormSchema = z.object({
    content: z.string().min(1, "Post content cannot be empty"),
})

interface Reaction {
    id: string;
    type: string;
    userId: string;
    postId: string;
    createdAt: Date;
    commentId: string | null;
}

interface Post {
    id: string;
    content: string;
    author: {
        name: string;
        image: string | null;
    };
    createdAt: string;
    reactions: Reaction[];
    _count: {
        replies: number;
    };
    parentId: string | null;
    parent: Post | null;
    mediaAttachments: string[];
}

export default function HomePage() {
    const { data: session } = useSession()
    const router = useRouter()
    const { toast } = useToast()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [posts, setPosts] = useState<Post[]>([])
    const [mediaFiles, setMediaFiles] = useState<File[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
    const [postToDelete, setPostToDelete] = useState<string | null>(null);

    const postForm = useForm<z.infer<typeof postFormSchema>>({
        resolver: zodResolver(postFormSchema),
        defaultValues: { content: '' },
    })

    useEffect(() => {
        fetchPosts()
    }, [])

    const fetchPosts = async () => {
        try {
            const response = await fetch('/api/posts?limit=10');
            if (response.ok) {
                const data = await response.json();
                setPosts(data.posts);
            } else {
                console.error('Failed to fetch posts:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching posts:', error);
        }
    };

    const onSubmitPost = async (values: z.infer<typeof postFormSchema>) => {
        setIsSubmitting(true)
        try {
            const formData = new FormData()
            formData.append('content', values.content)
            formData.append('visibility', 'public')
            
            mediaFiles.forEach(file => {
                formData.append('mediaAttachments', file)
            })

            const response = await fetch('/api/posts', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            })

            if (response.ok) {
                toast({ title: "Post created", description: "Your post has been successfully created." })
                postForm.reset()
                setMediaFiles([])
                fetchPosts()
            } else {
                throw new Error('Failed to create post')
            }
        } catch (error) {
            console.error('Error creating post:', error)
            toast({
                title: "Error",
                description: "Failed to create post. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

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

    const handleReaction = async (postId: string, type: string) => {
        const post = posts.find(p => p.id === postId);
        if (!post || !session?.user?.id) return;

        const hasReaction = post.reactions.some(
            r => r.userId === session.user.id && r.type === type
        );

        // Create a temporary reaction for optimistic update
        const tempReaction: Reaction = {
            id: 'temp',
            type,
            userId: session.user.id,
            postId,
            createdAt: new Date(),
            commentId: null
        };

        // Optimistically update the UI
        setPosts(posts.map(p => {
            if (p.id === postId) {
                return {
                    ...p,
                    reactions: hasReaction
                        ? p.reactions.filter(r => !(r.userId === session.user.id && r.type === type))
                        : [...p.reactions, tempReaction]
                };
            }
            return p;
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
            // Revert the optimistic update on error
            setPosts(prevPosts => prevPosts);
            console.error('Error updating reaction:', error);
            toast({
                title: "Error",
                description: "Failed to update reaction. Please try again.",
                variant: "destructive",
            });
        }
    };

    const handleDeletePost = async (postId: string) => {
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
                fetchPosts();
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

    const handleShare = async (postId: string) => {
        try {
            await navigator.share({
                title: 'Share Post',
                text: posts.find(p => p.id === postId)?.content || '',
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

    const handleReplyClick = (postId: string) => {
        router.push(`/post/${postId}`); // Navigate to specific post page
    };


    if (!session) {
        return <div className="text-center mt-8">Please sign in to view and create posts.</div>
    }

    return (
        <div className="max-w-2xl mx-auto mt-8">
            {/* Create Post Section */}
            <Card>
                <CardHeader>
                    <div className="flex items-center space-x-4">
                        <Avatar>
                            <AvatarImage src={session.user.image || undefined} />
                            <AvatarFallback>{session.user.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold">{session.user.name}</p>
                            <p className="text-sm text-gray-500">Public</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Form {...postForm}>
                        <form onSubmit={postForm.handleSubmit(onSubmitPost)}>
                            <FormField
                                control={postForm.control}
                                name="content"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Textarea
                                                placeholder="What's on your mind?"
                                                className="min-h-[100px] resize-none"
                                                {...field}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            {mediaFiles.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 mt-4">
                                    {mediaFiles.map((file, index) => (
                                        <div key={index} className="relative">
                                            {file.type.startsWith('image/') ? (
                                                <img
                                                    src={URL.createObjectURL(file)}
                                                    alt={`Preview ${index}`}
                                                    className="rounded-lg w-full h-32 object-cover"
                                                />
                                            ) : file.type.startsWith('video/') && (
                                                <video
                                                    src={URL.createObjectURL(file)}
                                                    className="rounded-lg w-full h-32 object-cover"
                                                />
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-full p-1"
                                                onClick={() => setMediaFiles(files => files.filter((_, i) => i !== index))}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                onChange={handleFileChange}
                                multiple
                                title="Upload media files"
                                aria-label="Upload media files"
                            />
                            <CardFooter className="flex justify-between items-center">
                                <div className="flex space-x-4">
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
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="text-yellow-500"
                                    >
                                        <Smile className="mr-2 h-4 w-4" />
                                        Feeling/Activity
                                    </Button>
                                </div>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Posting...' : 'Post'}
                                </Button>
                            </CardFooter>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <Separator className="my-8" />

            {/* Posts List */}
            {posts.map((post) => (
                <Card key={post.id} className="mb-8">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <Avatar>
                                    <AvatarImage src={post.author.image || undefined} />
                                    <AvatarFallback>{post.author.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold">{post.author.name}</p>
                                    <p className="text-sm text-gray-500">{new Date(post.createdAt).toLocaleString()}</p>
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
                        <p>{post.content}</p>
                        {post.mediaAttachments?.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 mt-4">
                                {post.mediaAttachments.map((url, index) => {
                                    const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                                    const isVideo = url.match(/\.(mp4|webm|ogg)$/i)

                                    if (isImage) {
                                        return (
                                            <div key={index} className="relative aspect-square bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                                                <img
                                                    src={url}
                                                    alt={`Media ${index + 1}`}
                                                    className="rounded-lg object-cover w-full h-full"
                                                    onError={(e) => {
                                                        const img = e.currentTarget;
                                                        if (!img.getAttribute('data-retried')) {
                                                            img.setAttribute('data-retried', 'true');
                                                            // Always use the media API route which handles authentication and SAS tokens
                                                            fetch(url, { 
                                                                credentials: 'include',
                                                                headers: {
                                                                    'Accept': 'image/*'
                                                                }
                                                            })
                                                            .then(response => {
                                                                if (!response.ok) throw new Error('Failed to load image');
                                                                if (response.redirected) {
                                                                    // If we get a redirect response, use the redirect URL
                                                                    img.src = response.url;
                                                                } else {
                                                                    return response.blob();
                                                                }
                                                            })
                                                            .then(blob => {
                                                                if (blob) {
                                                                    img.src = URL.createObjectURL(blob);
                                                                }
                                                            })
                                                            .catch(console.error);
                                                        }
                                                    }}
                                                />
                                            </div>
                                        )
                                    }

                                    if (isVideo) {
                                        return (
                                            <div key={index} className="relative aspect-video bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                                                <video
                                                    controls
                                                    className="rounded-lg w-full h-full"
                                                    onError={(e) => {
                                                        const video = e.currentTarget;
                                                        if (!video.getAttribute('data-retried')) {
                                                            video.setAttribute('data-retried', 'true');
                                                            // Always use the media API route which handles authentication and SAS tokens
                                                            fetch(url, { 
                                                                credentials: 'include',
                                                                headers: {
                                                                    'Accept': 'video/*'
                                                                }
                                                            })
                                                            .then(response => {
                                                                if (!response.ok) throw new Error('Failed to load video');
                                                                if (response.redirected) {
                                                                    // If we get a redirect response, use the redirect URL
                                                                    video.src = response.url;
                                                                } else {
                                                                    return response.blob();
                                                                }
                                                            })
                                                            .then(blob => {
                                                                if (blob) {
                                                                    video.src = URL.createObjectURL(blob);
                                                                }
                                                            })
                                                            .catch(console.error);
                                                        }
                                                    }}
                                                >
                                                    <source src={url} type="video/mp4" />
                                                    Your browser does not support the video tag.
                                                </video>
                                            </div>
                                        )
                                    }

                                    return null
                                })}
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-between">
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
                            onClick={() => handleReplyClick(post.id)}
                            className="post-action-button"
                        >
                            <MessageSquare className="h-5 w-5" />
                            {post._count.replies}
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