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
import { Image, Video, Smile, ThumbsUp, MessageSquare, Share2, X } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"


const postFormSchema = z.object({
    content: z.string().min(1, "Post content cannot be empty"),
})

interface Post {
    id: string;
    content: string;
    author: {
        name: string;
        image: string;
    };
    createdAt: string;
    reactions: { type: string; userId: string; }[];
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
        try {
            const response = await fetch(`/api/posts/${postId}/reactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type }),
            });

            if (response.ok) {
                fetchPosts();
            } else {
                throw new Error('Failed to add reaction');
            }
        } catch (error) {
            console.error('Error adding reaction:', error);
            toast({
                title: "Error",
                description: "Failed to add reaction. Please try again.",
                variant: "destructive",
            });
        }
    };

    const handleShare = (postId: string) => {
        console.log(`Sharing post ${postId}`)
        toast({ title: "Share", description: "Sharing functionality not implemented yet." })
    }


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
                    </CardHeader>
                    {post.parentId && post.parent &&(
                        <CardContent className="pl-14 italic text-sm text-gray-600">
                             Replying to <span className='font-medium text-black'>@{post.parent.author.name}</span>
                        </CardContent>
                    )}
                    <CardContent>
                        <p>{post.content}</p>
                        {post.mediaAttachments?.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 mt-4">
                                {post.mediaAttachments.map((url, index) => {
                                    const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                                    const isVideo = url.match(/\.(mp4|webm|ogg)$/i)

                                    if (isImage) {
                                        return (
                                            <div key={index} className="relative aspect-square">
                                                <img
                                                    src={url}
                                                    alt={`Media ${index + 1}`}
                                                    className="rounded-lg object-cover w-full h-full"
                                                />
                                            </div>
                                        )
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
                            className={post.reactions.some(r => r.userId === session.user.id && r.type === 'LIKE') ? 'text-blue-500' : ''}
                        >
                            <ThumbsUp className="mr-2 h-4 w-4" />
                            Like ({post.reactions.filter(r => r.type === 'LIKE').length})
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => handleReplyClick(post.id)}
                        >
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Replies ({post._count.replies})
                        </Button>
                        <Button variant="ghost" onClick={() => handleShare(post.id)}>
                            <Share2 className="mr-2 h-4 w-4" />
                            Share
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
    )
}