'use client'

import { useState, useEffect } from 'react'
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
import { Image, Video, Smile, ThumbsUp, MessageSquare, Share2 } from 'lucide-react'
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
}

export default function HomePage() {
    const { data: session } = useSession()
    const router = useRouter()
    const { toast } = useToast()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [posts, setPosts] = useState<Post[]>([])
    const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
    const [shareOption, setShareOption] = useState<string>('');
    const [showShareDialog, setShowShareDialog] = useState<string | null>(null);

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
            const response = await fetch('/api/posts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(values),
            })

            if (response.ok) {
              toast({ title: "Post created", description: "Your post has been successfully created." })
              postForm.reset()
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

    const handleReaction = async (postId: string, type: string) => {
        try {
            const method = posts.find(p => p.id === postId)?.reactions.some(r => r.userId === session?.user.id && r.type === type)
                ? 'DELETE'
                : 'POST';

            const response = await fetch(`/api/posts/${postId}/reactions`, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type }),
            });

            if (response.ok) {
                fetchPosts();
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

    const handleShare = async (postId: string) => {
        try {
            const postUrl = `${window.location.origin}/post/${postId}`;
            
            // Use Web Share API if available (mainly for mobile)
            if (navigator.share) {
                await navigator.share({
                    title: 'Share this post',
                    text: 'Check out this post on Threble',
                    url: postUrl
                });
            } else {
                // Show sharing options dialog
                const shareWindow = async (url: string) => {
                    const width = 600;
                    const height = 400;
                    const left = window.innerWidth / 2 - width / 2;
                    const top = window.innerHeight / 2 - height / 2;
                    window.open(
                        url,
                        'share',
                        `width=${width},height=${height},left=${left},top=${top}`
                    );
                };

                const encodedUrl = encodeURIComponent(postUrl);
                const text = encodeURIComponent('Check out this post on Threble');

                switch (shareOption) {
                    case 'whatsapp':
                        await shareWindow(`https://api.whatsapp.com/send?text=${text}%20${encodedUrl}`);
                        break;
                    case 'facebook':
                        await shareWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`);
                        break;
                    case 'twitter':
                        await shareWindow(`https://twitter.com/intent/tweet?text=${text}&url=${encodedUrl}`);
                        break;
                    case 'linkedin':
                        await shareWindow(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`);
                        break;
                    case 'telegram':
                        await shareWindow(`https://t.me/share/url?url=${encodedUrl}&text=${text}`);
                        break;
                    case 'copy':
                        await navigator.clipboard.writeText(postUrl);
                        toast({
                            title: "Link Copied",
                            description: "Post link has been copied to clipboard.",
                        });
                        break;
                }
            }
        } catch (error) {
            console.error('Error sharing:', error);
            toast({
                title: "Error",
                description: "Failed to share post.",
                variant: "destructive",
            });
        }
    };

    const handlePostClick = (e: React.MouseEvent, postId: string) => {
        // Don't navigate if clicking on buttons or interactive elements
        if ((e.target as HTMLElement).closest('button')) {
            return;
        }
        router.push(`/post/${postId}`);
    };

    const handleReplyClick = (postId: string) => {
        router.push(`/post/${postId}`); // Navigate to specific post page
    };


    if (!session) {
        return <div className="text-center mt-8">Please sign in to view and create posts.</div>
    }

    return (
        <div className="max-w-2xl mx-auto py-6 px-4">
            {/* Create Post Section */}
            <Card className="mb-8 border-none bg-white dark:bg-slate-900 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center space-x-4">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={session.user.image || undefined} />
                            <AvatarFallback>{session.user.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{session.user.name}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Public</p>
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
                                                className="min-h-[100px] resize-none border-none bg-slate-50 dark:bg-slate-800 focus-visible:ring-1 focus-visible:ring-slate-300 dark:focus-visible:ring-slate-700"
                                                {...field}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex space-x-2">
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                                    >
                                        <Image className="mr-2 h-4 w-4" />
                                        Photo
                                    </Button>
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
                                    >
                                        <Video className="mr-2 h-4 w-4" />
                                        Video
                                    </Button>
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        className="text-amber-600 dark:text-amber-400 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950"
                                    >
                                        <Smile className="mr-2 h-4 w-4" />
                                        Mood
                                    </Button>
                                </div>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
                                >
                                    {isSubmitting ? 'Posting...' : 'Post'}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <Separator className="my-8" />

            {/* Posts List */}
            {posts.map((post) => (
                <Card 
                    key={post.id} 
                    className="mb-6 border-none bg-white dark:bg-slate-900 shadow-sm"
                >
                    <CardHeader className="pb-3">
                        <div className="flex items-center space-x-4">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={post.author.image || undefined} />
                                <AvatarFallback>{post.author.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold text-slate-900 dark:text-slate-100">{post.author.name}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{new Date(post.createdAt).toLocaleString()}</p>
                            </div>
                        </div>
                    </CardHeader>
                    {post.parentId && post.parent &&(
                        <CardContent className="pl-14 italic text-sm text-slate-600 dark:text-slate-400 pb-2">
                             Replying to <span className='font-medium text-slate-900 dark:text-slate-100'>@{post.parent.author.name}</span>
                        </CardContent>
                    )}
                    <CardContent className="pt-2" onClick={(e) => handlePostClick(e, post.id)}>
                        <p className="text-slate-800 dark:text-slate-200">{post.content}</p>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t border-slate-100 dark:border-slate-800 mt-4 pt-4">
                        <Button
                            variant="ghost"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleReaction(post.id, 'LIKE');
                            }}
                            className={post.reactions.some(r => r.userId === session.user.id && r.type === 'LIKE') 
                                ? 'text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950' 
                                : 'text-slate-600 dark:text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950'}
                        >
                            <ThumbsUp className="mr-2 h-4 w-4" />
                            {post.reactions.filter(r => r.type === 'LIKE').length}
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleReplyClick(post.id);
                            }}
                            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                        >
                            <MessageSquare className="mr-2 h-4 w-4" />
                            {post._count.replies}
                        </Button>
                        <div className="relative">
                            <Button 
                                variant="ghost" 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowShareDialog(showShareDialog === post.id ? null : post.id);
                                }}
                                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                            >
                                <Share2 className="mr-2 h-4 w-4" />
                                Share
                            </Button>
                            {showShareDialog === post.id && (
                                <Card className="absolute bottom-full right-0 mb-2 p-2 z-50 min-w-[200px] border border-slate-200 dark:border-slate-700 shadow-lg">
                                    <div className="flex flex-col space-y-1">
                                        <Button 
                                            variant="ghost" 
                                            className="justify-start text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShareOption('whatsapp');
                                                handleShare(post.id);
                                                setShowShareDialog(null);
                                            }}
                                        >
                                            Share on WhatsApp
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            className="justify-start text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShareOption('facebook');
                                                handleShare(post.id);
                                                setShowShareDialog(null);
                                            }}
                                        >
                                            Share on Facebook
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            className="justify-start text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShareOption('twitter');
                                                handleShare(post.id);
                                                setShowShareDialog(null);
                                            }}
                                        >
                                            Share on X (Twitter)
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            className="justify-start text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShareOption('linkedin');
                                                handleShare(post.id);
                                                setShowShareDialog(null);
                                            }}
                                        >
                                            Share on LinkedIn
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            className="justify-start text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShareOption('telegram');
                                                handleShare(post.id);
                                                setShowShareDialog(null);
                                            }}
                                        >
                                            Share on Telegram
                                        </Button>
                                        <Separator className="my-1" />
                                        <Button 
                                            variant="ghost" 
                                            className="justify-start text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShareOption('copy');
                                                handleShare(post.id);
                                                setShowShareDialog(null);
                                            }}
                                        >
                                            Copy Link
                                        </Button>
                                    </div>
                                </Card>
                            )}
                        </div>
                    </CardFooter>
                </Card>
            ))}
        </div>
    )
}