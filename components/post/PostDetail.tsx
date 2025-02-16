'use client'

import { useState } from 'react'
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
import { ThumbsUp, MessageSquare, Share2 } from 'lucide-react'
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
    if (!mediaAttachments?.length) return null;

    return (
        <div className={`mt-4 grid grid-cols-2 gap-2 ${className}`}>
            {mediaAttachments.map((url, index) => {
                const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                const isVideo = url.match(/\.(mp4|webm|ogg)$/i);
                const isAudio = url.match(/\.(mp3|wav|ogg)$/i);

                if (isImage) {
                    return (
                        <div key={index} className="relative aspect-square">
                            <img
                                src={url}
                                alt={`Media ${index + 1}`}
                                className="rounded-lg object-cover w-full h-full"
                            />
                        </div>
                    );
                }

                if (isVideo) {
                    return (
                        <div key={index} className="relative aspect-video">
                            <video
                                controls
                                className="rounded-lg w-full h-full"
                            >
                                <source src={url} type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>
                        </div>
                    );
                }

                if (isAudio) {
                    return (
                        <div key={index} className="col-span-2">
                            <audio
                                controls
                                className="w-full"
                            >
                                <source src={url} type="audio/mpeg" />
                                Your browser does not support the audio tag.
                            </audio>
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
    const [shareOption, setShareOption] = useState<string>('')
    const [showShareDialog, setShowShareDialog] = useState<boolean>(false)
    const [mediaFiles, setMediaFiles] = useState<File[]>([])

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

    const onSubmitReply = async (values: z.infer<typeof replyFormSchema>) => {
        setIsSubmitting(true)
        try {
            const formData = new FormData()
            formData.append('content', values.content)
            formData.append('visibility', 'public')
            formData.append('parentId', post.id)

            // Add media files if present
            mediaFiles.forEach(file => {
                formData.append('mediaAttachments', file);
            });

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
                        <FileUpload
                            multiple
                            accept="image/*,video/*,audio/*"
                            onChange={setMediaFiles}
                            maxSize={20}
                            maxFiles={4}
                            label="Add Photos/Videos to Reply"
                        />
                        <Button 
                            type="submit" 
                            disabled={isSubmitting} 
                            className="w-fit ml-auto bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isSubmitting ? 'Posting...' : 'Reply'}
                        </Button>
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