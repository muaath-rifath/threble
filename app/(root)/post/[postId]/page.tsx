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
import { ThumbsUp, MessageSquare, Share2 } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"

const replyFormSchema = z.object({
    content: z.string().min(1, "Reply cannot be empty"),
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
}

export default function PostDetailPage({ params }: { params: { postId: string } }) {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Post[]>([])
  const [shareOption, setShareOption] = useState<string>('');
  const [showShareDialog, setShowShareDialog] = useState<boolean>(false);

  const replyForm = useForm<z.infer<typeof replyFormSchema>>({
      resolver: zodResolver(replyFormSchema),
      defaultValues: { content: '' },
  })

  const fetchPost = async () => {
      try {
          const response = await fetch(`/api/posts/${params.postId}`);
          if (response.ok) {
              const data = await response.json();
              setPost(data.post);
          } else {
              console.error('Failed to fetch post:', response.statusText);
          }
      } catch (error) {
          console.error('Error fetching post:', error);
      }
  };

  const fetchReplies = async () => {
      try {
          const response = await fetch(`/api/posts/${params.postId}/replies`);
          if (response.ok) {
              const data = await response.json();
              setReplies(data.replies);
          } else {
              console.error('Failed to fetch replies:', response.statusText);
          }
      } catch (error) {
          console.error('Error fetching replies:', error);
      }
  };

  useEffect(() => {
      if(params.postId) {
          fetchPost()
          fetchReplies()
      }
  }, [params.postId]);

  const onSubmitReply = async (values: z.infer<typeof replyFormSchema>) => {
      setIsSubmitting(true)
      try {
          const response = await fetch('/api/posts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...values, parentId: params.postId }),
          })

          if (response.ok) {
              toast({ title: "Reply created", description: "Your reply has been successfully created." });
              replyForm.reset()
              fetchReplies();
          } else {
              throw new Error('Failed to create reply')
          }
      } catch (error) {
          console.error('Error creating reply:', error)
          toast({
              title: "Error",
              description: "Failed to create reply. Please try again.",
              variant: "destructive",
          })
      } finally {
          setIsSubmitting(false)
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
              fetchPost()
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

  const handleShare = async (postId: string) => {
    try {
        const postUrl = `${window.location.origin}/post/${postId}`;
        
        if (navigator.share) {
            await navigator.share({
                title: 'Share this post',
                text: 'Check out this post on Threble',
                url: postUrl
            });
        } else {
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

  const handleReplyClick = (postId: string) => {
      router.push(`/post/${postId}`);
  };

  if (!session || !post) {
    return <div className="text-center mt-8">Please sign in to view and reply to posts.</div>
  }

  return (
    <div className="max-w-2xl mx-auto mt-8">
        {/* Original Post and Reply Form Combined */}
        <Card className='mb-8'>
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
            <CardContent>
                <p>{post.content}</p>
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
                <Button variant="ghost">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Replies ({post._count.replies})
                </Button>
                <div className="relative">
                    <Button 
                        variant="ghost" 
                        onClick={() => setShowShareDialog(!showShareDialog)}
                        className="flex items-center space-x-2"
                    >
                        <Share2 className="h-4 w-4" />
                        <span>Share</span>
                    </Button>
                    {showShareDialog && (
                        <Card className="absolute bottom-full right-0 mb-2 p-2 z-50 min-w-[200px]">
                            <div className="flex flex-col space-y-2">
                                <Button 
                                    variant="ghost" 
                                    className="justify-start"
                                    onClick={() => {
                                        setShareOption('whatsapp');
                                        handleShare(post.id);
                                        setShowShareDialog(false);
                                    }}
                                >
                                    Share on WhatsApp
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    className="justify-start"
                                    onClick={() => {
                                        setShareOption('facebook');
                                        handleShare(post.id);
                                        setShowShareDialog(false);
                                    }}
                                >
                                    Share on Facebook
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    className="justify-start"
                                    onClick={() => {
                                        setShareOption('twitter');
                                        handleShare(post.id);
                                        setShowShareDialog(false);
                                    }}
                                >
                                    Share on X (Twitter)
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    className="justify-start"
                                    onClick={() => {
                                        setShareOption('linkedin');
                                        handleShare(post.id);
                                        setShowShareDialog(false);
                                    }}
                                >
                                    Share on LinkedIn
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    className="justify-start"
                                    onClick={() => {
                                        setShareOption('telegram');
                                        handleShare(post.id);
                                        setShowShareDialog(false);
                                    }}
                                >
                                    Share on Telegram
                                </Button>
                                <Separator />
                                <Button 
                                    variant="ghost" 
                                    className="justify-start"
                                    onClick={() => {
                                        setShareOption('copy');
                                        handleShare(post.id);
                                        setShowShareDialog(false);
                                    }}
                                >
                                    Copy Link
                                </Button>
                            </div>
                        </Card>
                    )}
                </div>
            </CardFooter>

            {/* Reply Form */}
            <CardContent>
                <Form {...replyForm}>
                    <form onSubmit={replyForm.handleSubmit(onSubmitReply)} className='flex flex-col space-y-2'>
                        <FormField
                            control={replyForm.control}
                            name="content"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Textarea
                                            placeholder="What's your reply?"
                                            className="resize-none min-h-[70px]"
                                            {...field}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={isSubmitting} className='w-fit ml-auto bg-primary-500'>
                            {isSubmitting ? 'Posting...' : 'Reply'}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>

        <Separator className="my-8" />

        {/* Replies List */}
        {replies.map((reply) => (
            <Card key={reply.id} className="mb-8">
                <CardHeader>
                    <div className="flex items-center space-x-4">
                        <Avatar>
                            <AvatarImage src={reply.author.image || undefined} />
                            <AvatarFallback>{reply.author.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold">{reply.author.name}</p>
                            <p className="text-sm text-gray-500">{new Date(reply.createdAt).toLocaleString()}</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {reply.parentId && post && 
                      <p className="italic text-sm text-gray-600">Replying to: {post.author.name}</p>}
                    <p>{reply.content}</p>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button
                        variant="ghost"
                        onClick={() => handleReaction(reply.id, 'LIKE')}
                        className={reply.reactions.some(r => r.userId === session.user.id && r.type === 'LIKE') ? 'text-blue-500' : ''}
                    >
                        <ThumbsUp className="mr-2 h-4 w-4" />
                        Like ({reply.reactions.filter(r => r.type === 'LIKE').length})
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => handleReplyClick(reply.id)}
                    >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Replies ({reply._count.replies})
                    </Button>
                    <Button variant="ghost" onClick={() => handleShare(reply.id)}>
                        <Share2 className="mr-2 h-4 w-4" />
                        Share
                    </Button>
                </CardFooter>
            </Card>
        ))}
    </div>
  )
}
