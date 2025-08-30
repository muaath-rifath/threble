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
import { IconPhoto, IconVideo, IconX } from '@tabler/icons-react'
import { ExtendedPost } from '@/lib/types'

import PostCard, { Post } from './PostCard'

const replyFormSchema = z.object({
    content: z.string().min(1, "Reply cannot be empty"),
})

// Helper function to transform ExtendedPost to Post interface
const transformExtendedPostToPost = (extendedPost: ExtendedPost): Post => {
    return {
        id: extendedPost.id,
        content: extendedPost.content,
        author: {
            id: extendedPost.author.id,
            name: extendedPost.author.name,
            username: extendedPost.author.username,
            image: extendedPost.author.image,
        },
        createdAt: extendedPost.createdAt,
        updatedAt: extendedPost.updatedAt,
        reactions: extendedPost.reactions,
        _count: extendedPost._count,
        mediaAttachments: extendedPost.mediaAttachments,
        parent: extendedPost.parent ? {
            id: extendedPost.parent.id,
            author: {
                id: extendedPost.parent.author.id,
                name: extendedPost.parent.author.name,
                username: extendedPost.parent.author.username,
            }
        } : undefined
    }
}

interface PostDetailViewProps {
    initialPost: ExtendedPost
    session: Session
}

export default function PostDetailView({ initialPost, session }: PostDetailViewProps) {
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
                title: "Success", 
                description: "Your reply has been posted successfully." 
            })
            replyForm.reset()
            setMediaFiles([])
            fetchPost()
            router.refresh()
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to post reply. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleRemoveMedia = (index: number) => {
        setMediaFiles(prev => prev.filter((_, i) => i !== index))
    }

    return (
        <div className="max-w-2xl mx-auto mt-8">
            <PostCard 
                post={transformExtendedPostToPost(post)} 
                session={session} 
                onUpdate={fetchPost}
                showFullContent={true}
                hideRepliedTo={true} // Hide "Replied to" in detail view
            />
            
            {/* Reply Form */}
            <Card className="mt-8 border-none bg-white dark:bg-slate-900 shadow-sm">
                <CardContent className="p-6">
                    <Form {...replyForm}>
                        <form onSubmit={replyForm.handleSubmit(onSubmitReply)} className="space-y-4">
                            <div className="flex items-start space-x-4">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={session?.user?.image || undefined} />
                                    <AvatarFallback>{session?.user?.name?.[0]}</AvatarFallback>
                                </Avatar>
                                <FormField
                                    control={replyForm.control}
                                    name="content"
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormControl>
                                                <Textarea
                                                    {...field}
                                                    placeholder="Write your reply..."
                                                    className="min-h-[100px] resize-none"
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>
                            {mediaFiles.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 pl-14">
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
                                                variant="destructive"
                                                size="icon"
                                                className="absolute top-2 right-2 h-6 w-6"
                                                onClick={() => handleRemoveMedia(index)}
                                            >
                                                <span className="sr-only">Remove</span>
                                                <IconX className="h-4 w-4" />
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
                                        onClick={() => handleFileSelect('image/*')}
                                    >
                                        <IconPhoto className="mr-2 h-4 w-4" />
                                        Photo
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => handleFileSelect('video/*')}
                                    >
                                        <IconVideo className="mr-2 h-4 w-4" />
                                        Video
                                    </Button>
                                </div>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Posting...' : 'Reply'}
                                </Button>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                onChange={handleFileChange}
                                multiple
                                aria-label="Upload media attachments"
                            />
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <div className="mt-8 space-y-6">
                {post.replies.map((reply) => (
                    <PostCard
                        key={reply.id}
                        post={transformExtendedPostToPost(reply)}
                        session={session}
                        onUpdate={fetchPost}
                        isReply={true}
                    />
                ))}
            </div>

            <Separator className="my-8" />
        </div>
    )
}