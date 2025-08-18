'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Session } from 'next-auth'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    Form,
    FormField,
    FormItem,
    FormControl,
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { Image, Video, X, MessageSquare, ArrowLeft } from 'lucide-react'
import { ExtendedPost } from '@/lib/types'

import PostCard from './PostCard'
import ThreadReply from './ThreadReply'

const replyFormSchema = z.object({
    content: z.string().min(1, "Reply cannot be empty"),
})

interface ThreadViewProps {
    initialPost: ExtendedPost
    session: Session
}

export default function ThreadView({ initialPost, session }: ThreadViewProps) {
    const router = useRouter()
    const { toast } = useToast()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [post, setPost] = useState<ExtendedPost>(initialPost)
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

    const handleFileSelect = (acceptedTypes: string) => {
        if (fileInputRef.current) {
            fileInputRef.current.accept = acceptedTypes
            fileInputRef.current.click()
        }
    }

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || [])
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
            setMediaFiles(prev => [...prev, ...files])
        }
    }

    const removeMediaFile = (index: number) => {
        setMediaFiles(prev => prev.filter((_, i) => i !== index))
    }

    const onSubmitReply = async (values: z.infer<typeof replyFormSchema>) => {
        setIsSubmitting(true)
        try {
            const formData = new FormData()
            formData.append('content', values.content)
            formData.append('parentId', post.id)

            mediaFiles.forEach(file => {
                formData.append('mediaAttachments', file)
            })

            const response = await fetch('/api/posts', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to post reply')
            }

            toast({
                title: "Reply posted",
                description: "Your reply has been successfully posted.",
            })

            replyForm.reset()
            setMediaFiles([])
            // Refresh the thread to show the new reply
            window.location.reload()
        } catch (error) {
            console.error('Error posting reply:', error)
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to post reply. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="container max-w-2xl mx-auto p-4">
            {/* Header with back button */}
            <div className="flex items-center gap-4 mb-6">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.back()}
                    className="flex items-center gap-2"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </Button>
                <h1 className="text-xl font-semibold">Thread</h1>
            </div>

            {/* Show parent post if this is a reply */}
            {post.parent && (
                <div className="mb-4">
                    <Card className="border-l-4 border-blue-500">
                        <PostCard
                            post={post.parent}
                            session={session}
                            onUpdate={fetchPost}
                            isReply={false}
                            showFullContent={true}
                        />
                    </Card>
                    <div className="ml-8 border-l-2 border-gray-200 dark:border-gray-700 pl-4 py-2">
                        <div className="text-sm text-gray-500">Replying to @{post.parent.author.name}</div>
                    </div>
                </div>
            )}

            {/* Main post */}
            <Card className="mb-6">
                <PostCard
                    post={post}
                    session={session}
                    onUpdate={fetchPost}
                    isReply={!!post.parent}
                    showFullContent={true}
                />
            </Card>

            {/* Reply form */}
            <Card className="mb-6">
                <CardContent className="p-4">
                    <div className="flex gap-3">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={session.user.image || ''} />
                            <AvatarFallback>
                                {session.user.name?.charAt(0) || 'U'}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <Form {...replyForm}>
                                <form onSubmit={replyForm.handleSubmit(onSubmitReply)} className="space-y-4">
                                    <FormField
                                        control={replyForm.control}
                                        name="content"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Post your reply..."
                                                        className="min-h-[100px] resize-none border-0 p-0 focus:ring-0 text-lg"
                                                        {...field}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    {/* Media preview */}
                                    {mediaFiles.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {mediaFiles.map((file, index) => (
                                                <div key={index} className="relative">
                                                    <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                                                        {file.type.startsWith('image/') ? (
                                                            <Image className="h-8 w-8 text-gray-400" />
                                                        ) : (
                                                            <Video className="h-8 w-8 text-gray-400" />
                                                        )}
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="sm"
                                                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                                                        onClick={() => removeMediaFile(index)}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center">
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleFileSelect('image/*')}
                                            >
                                                <Image className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleFileSelect('video/*')}
                                            >
                                                <Video className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <Button
                                            type="submit"
                                            disabled={isSubmitting || !replyForm.watch('content').trim()}
                                            className="bg-blue-500 hover:bg-blue-600 text-white px-6"
                                        >
                                            {isSubmitting ? 'Posting...' : 'Reply'}
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Thread replies */}
            {post.replies && post.replies.length > 0 && (
                <div className="space-y-2">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Replies
                    </h2>
                    {post.replies.map((reply: any) => (
                        <ThreadReply
                            key={reply.id}
                            reply={reply}
                            session={session}
                            onUpdate={fetchPost}
                            depth={0}
                            parentAuthors={[post.author.username || post.author.name || 'unknown']}
                        />
                    ))}
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />
        </div>
    )
}
