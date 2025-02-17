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
import {
    Form,
    FormField,
    FormItem,
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { Image, Video } from 'lucide-react'
import { ExtendedPost } from '@/lib/types'
import PostCard from './PostCard'
import { createPost } from '@/lib/actions/post.actions'

const replyFormSchema = z.object({
    content: z.string().min(1, "Reply cannot be empty"),
})

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
            formData.append('visibility', 'public')
            formData.append('parentId', post.id)

            mediaFiles.forEach(file => {
                formData.append('mediaAttachments', file)
            })

            const result = await createPost(formData)

            if (!result.success) {
                throw new Error(result.error)
            }

            toast({ 
                title: "Reply posted", 
                description: "Your reply has been successfully posted." 
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
                post={post} 
                session={session} 
                onUpdate={fetchPost}
                showFullContent={true}
            />
            
            {/* Reply Form */}
            <Card className="mt-8 border-none bg-white dark:bg-slate-900 shadow-sm">
                <CardContent className="p-6">
                    <Form {...replyForm}>
                        <form onSubmit={replyForm.handleSubmit(onSubmitReply)} className="space-y-4">
                            <FormField
                                control={replyForm.control}
                                name="content"
                                render={({ field }) => (
                                    <FormItem>
                                        <Textarea
                                            {...field}
                                            placeholder="Write a reply..."
                                            className="min-h-[100px]"
                                        />
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
                                                variant="destructive"
                                                size="icon"
                                                className="absolute top-2 right-2 h-6 w-6"
                                                onClick={() => handleRemoveMedia(index)}
                                            >
                                                <span className="sr-only">Remove</span>
                                                ×
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="flex justify-between items-center pt-4">
                                <div className="flex space-x-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleFileSelect('image/*')}
                                    >
                                        <Image className="h-5 w-5" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleFileSelect('video/*')}
                                    >
                                        <Video className="h-5 w-5" />
                                    </Button>
                                </div>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                >
                                    Reply
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
                        post={reply}
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