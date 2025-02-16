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
import { Image, Video, ThumbsUp, MessageSquare, Share2, X } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { Session } from 'next-auth'
import type { Post, Prisma } from '@prisma/client'
import { FileUpload } from "@/components/ui/file-upload"

const replyFormSchema = z.object({
    content: z.string().min(1, "Reply cannot be empty"),
})

type ExtendedPost = Prisma.PostGetPayload<{
    include: {
        author: {
            select: {
                name: true;
                image: true;
            };
        };
        reactions: true;
        _count: {
            select: { replies: true };
        };
        parent: {
            include: {
                author: {
                    select: { name: true; image: true };
                };
            };
        };
        replies: {
            include: {
                author: {
                    select: {
                        name: true;
                        image: true;
                    };
                };
                parent: {
                    include: {
                        author: {
                            select: { name: true; image: true };
                        };
                    };
                };
                reactions: true;
                _count: {
                    select: { replies: true };
                };
            };
        };
    };
}>;

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
        // Reset states when media attachments change
        setLoadingStates({});
        setErrorStates({});
        setMediaUrls({});
    }, [mediaAttachments]);

    if (!mediaAttachments?.length) return null;

    const handleImageLoad = (url: string) => {
        setLoadingStates(prev => ({ ...prev, [url]: false }));
        setErrorStates(prev => ({ ...prev, [url]: false }));
    };

    const handleImageError = (url: string) => {
        console.error(`Failed to load media: ${url}`);
        setLoadingStates(prev => ({ ...prev, [url]: false }));
        setErrorStates(prev => ({ ...prev, [url]: true }));
    };

    const fetchMedia = async (url: string) => {
        try {
            setErrorStates(prev => ({ ...prev, [url]: false }));
            setLoadingStates(prev => ({ ...prev, [url]: true }));

            console.log('Fetching media from:', url); // Debug log

            const response = await fetch(url, {
                credentials: 'include',
                headers: {
                    'Accept': 'image/*, video/*, audio/*'
                }
            });

            console.log('Response status:', response.status); // Debug log
            console.log('Response headers:', Object.fromEntries(response.headers.entries())); // Debug log

            if (!response.ok) {
                console.error('Response not OK:', response.statusText);
                throw new Error(`Failed to load media: ${response.statusText}`);
            }

            const blob = await response.blob();
            console.log('Blob type:', blob.type); // Debug log
            const objectUrl = URL.createObjectURL(blob);
            
            setMediaUrls(prev => ({ ...prev, [url]: objectUrl }));
            handleImageLoad(url);
            return objectUrl;
        } catch (error) {
            console.error('Fetch error:', error);
            handleImageError(url);
            return url;
        }
    };

    return (
        <div className={`mt-4 grid grid-cols-2 gap-2 ${className}`}>
            {mediaAttachments.map((url, index) => {
                const isImage = url.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)($|\?)/i);
                const isVideo = url.toLowerCase().match(/\.(mp4|webm|ogg)($|\?)/i);
                const isAudio = url.toLowerCase().match(/\.(mp3|wav)($|\?)/i);

                // Use cached blob URL if available, otherwise fetch new one
                const mediaUrl = mediaUrls[url] || url;

                if (isImage) {
                    return (
                        <div key={index} className="relative aspect-square bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                            {loadingStates[url] !== false && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                            <img
                                src={mediaUrl}
                                alt={`Media ${index + 1}`}
                                className={`rounded-lg object-cover w-full h-full transition-opacity duration-200 ${
                                    loadingStates[url] === false ? 'opacity-100' : 'opacity-0'
                                }`}
                                onLoad={() => handleImageLoad(url)}
                                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                    console.error('Image load error:', e);
                                    if (!mediaUrls[url]) {
                                        fetchMedia(url);
                                    } else {
                                        handleImageError(url);
                                    }
                                }}
                            />
                            {errorStates[url] && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-sm text-red-500 bg-slate-100 dark:bg-slate-800 bg-opacity-90">
                                    <span>Failed to load media</span>
                                    <button 
                                        onClick={() => fetchMedia(url)}
                                        className="mt-2 text-blue-500 hover:underline"
                                    >
                                        Retry
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                }

                if (isVideo) {
                    return (
                        <div key={index} className="relative aspect-video bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                            <video
                                controls
                                className="rounded-lg w-full h-full"
                                onError={() => {
                                    if (!mediaUrls[url]) {
                                        fetchMedia(url);
                                    } else {
                                        handleImageError(url);
                                    }
                                }}
                            >
                                <source src={mediaUrl} type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>
                            {errorStates[url] && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-sm text-red-500 bg-slate-100 dark:bg-slate-800 bg-opacity-90">
                                    <span>Failed to load video</span>
                                    <button 
                                        onClick={() => fetchMedia(url)}
                                        className="mt-2 text-blue-500 hover:underline"
                                    >
                                        Retry
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                }

                if (isAudio) {
                    return (
                        <div key={index} className="col-span-2">
                            <audio
                                controls
                                className="w-full"
                                onError={() => {
                                    if (!mediaUrls[url]) {
                                        fetchMedia(url);
                                    } else {
                                        handleImageError(url);
                                    }
                                }}
                            >
                                <source src={mediaUrl} type="audio/mpeg" />
                                Your browser does not support the audio tag.
                            </audio>
                            {errorStates[url] && (
                                <div className="text-sm text-red-500">
                                    <span>Failed to load audio</span>
                                    <button 
                                        onClick={() => fetchMedia(url)}
                                        className="ml-2 text-blue-500 hover:underline"
                                    >
                                        Retry
                                    </button>
                                </div>
                            )}
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
    const [post, setPost] = useState(initialPost)
    const [mediaFiles, setMediaFiles] = useState<File[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)

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
        try {
            const method = post.reactions.some(r => r.userId === session.user.id && r.type === type)
                ? 'DELETE'
                : 'POST';

            const response = await fetch(`/api/posts/${postId}/reactions`, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type }),
            });

            if (response.ok) {
                fetchPost();
            } else {
                throw new Error('Failed to update reaction');
            }
        } catch (error) {
            console.error('Error updating reaction:', error);
            toast({
                title: "Error",
                description: "Failed to update reaction. Please try again.",
                variant: "destructive",
            });
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

    return (
        <div className="max-w-2xl mx-auto mt-8">
            <Card className="mb-8 border-none bg-white dark:bg-slate-900 shadow-sm">
                <CardHeader className="pb-3">
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
                </CardHeader>
                {post.parentId && post.parent && (
                    <CardContent className="pl-14 italic text-sm text-slate-600 dark:text-slate-400 pb-2">
                        Replied to{' '}
                        <button
                            onClick={() => router.push(`/post/${post.parentId}`)}
                            className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            @{post.parent.author.name}
                        </button>
                    </CardContent>
                )}
                <CardContent className="pt-2">
                    <p className="text-slate-800 dark:text-slate-200">{post.content}</p>
                    <MediaContent mediaAttachments={post.mediaAttachments} />
                </CardContent>
                <CardFooter className="flex justify-between border-t border-slate-100 dark:border-slate-800 mt-4 pt-4">
                    <Button
                        variant="ghost"
                        onClick={() => handleReaction(post.id, 'LIKE')}
                        className={post.reactions.some(r => r.userId === session.user.id && r.type === 'LIKE') 
                            ? 'text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950' 
                            : 'text-slate-600 dark:text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950'}
                    >
                        <ThumbsUp className="mr-2 h-4 w-4" />
                        {post.reactions.filter(r => r.type === 'LIKE').length}
                    </Button>
                </CardFooter>
            </Card>

            <CardContent className="mt-4 mb-8">
                <Form {...replyForm}>
                    <form onSubmit={replyForm.handleSubmit(onSubmitReply)} className="flex flex-col space-y-4">
                        <FormField
                            control={replyForm.control}
                            name="content"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Write your reply..."
                                            className="resize-none min-h-[70px] bg-slate-50 dark:bg-slate-800 border-none"
                                            {...field}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        {mediaFiles.length > 0 && (
                            <div className="grid grid-cols-2 gap-2">
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
                        />
                        <div className="flex justify-between items-center">
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
                            </div>
                            <Button 
                                type="submit" 
                                disabled={isSubmitting} 
                                className="w-fit ml-auto bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {isSubmitting ? 'Posting...' : 'Reply'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>

            <Separator className="my-8" />

            <div className="space-y-6">
                {post.replies.map((reply) => (
                    <Card 
                        key={reply.id} 
                        className="border-none bg-white dark:bg-slate-900 shadow-sm"
                    >
                        <CardHeader className="pb-3">
                            <div className="flex items-center space-x-4">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={reply.author.image || undefined} />
                                    <AvatarFallback>{reply.author.name?.charAt(0) || '?'}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold text-slate-900 dark:text-slate-100">{reply.author.name}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        {new Date(reply.createdAt).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </CardHeader>
                        {reply.parentId && (
                            <CardContent className="pl-14 italic text-sm text-slate-600 dark:text-slate-400 pb-2">
                                Replied to{' '}
                                <button
                                    onClick={() => router.push(`/post/${reply.parentId}`)}
                                    className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                    @{post.author.name}
                                </button>
                            </CardContent>
                        )}
                        <CardContent className="pt-2">
                            <p className="text-slate-800 dark:text-slate-200">{reply.content}</p>
                            <MediaContent mediaAttachments={reply.mediaAttachments} />
                        </CardContent>
                        <CardFooter className="flex justify-between border-t border-slate-100 dark:border-slate-800 mt-4 pt-4">
                            <Button
                                variant="ghost"
                                onClick={() => handleReaction(reply.id, 'LIKE')}
                                className={reply.reactions.some(r => r.userId === session.user.id && r.type === 'LIKE') 
                                    ? 'text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950' 
                                    : 'text-slate-600 dark:text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950'}
                            >
                                <ThumbsUp className="mr-2 h-4 w-4" />
                                {reply.reactions.filter(r => r.type === 'LIKE').length}
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => router.push(`/post/${reply.id}`)}
                                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                            >
                                <MessageSquare className="mr-2 h-4 w-4" />
                                {reply._count.replies}
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    )
}