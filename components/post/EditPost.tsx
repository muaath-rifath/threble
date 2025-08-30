'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Session } from 'next-auth'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { IconPhoto, IconVideo, IconX } from '@tabler/icons-react'
import { ExtendedPost } from '@/lib/types'

interface EditPostProps {
    post: ExtendedPost
    session: Session
}

export default function EditPost({ post, session }: EditPostProps) {
    const router = useRouter()
    const { toast } = useToast()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [content, setContent] = useState(post.content)
    const [mediaFiles, setMediaFiles] = useState<File[]>([])
    const [keepMediaUrls, setKeepMediaUrls] = useState<string[]>(post.mediaAttachments || [])
    const fileInputRef = useRef<HTMLInputElement>(null)

    if (session?.user?.id !== post.author.id) {
        router.push(`/thread/${post.id}`)
        return null
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

    const handleRemoveMedia = (index: number) => {
        setMediaFiles(prev => prev.filter((_, i) => i !== index))
    }

    const handleRemoveExistingMedia = (url: string) => {
        setKeepMediaUrls(prev => prev.filter(u => u !== url))
    }

    const handleSubmit = async () => {
        if (!content.trim()) {
            toast({
                title: "Error",
                description: "Post content cannot be empty",
                variant: "destructive",
            })
            return
        }

        setIsSubmitting(true)
        try {
            const formData = new FormData()
            formData.append('content', content)
            formData.append('keepMediaUrls', keepMediaUrls.join(','))

            mediaFiles.forEach(file => {
                formData.append('mediaAttachments', file)
            })

            const response = await fetch(`/api/posts/${post.id}`, {
                method: 'PATCH',
                body: formData,
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to update post')
            }

            toast({
                title: "Success",
                description: "Post updated successfully." 
            })
            router.push(`/thread/${post.id}`)
            router.refresh()
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to update post. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Card className="max-w-2xl mx-auto mt-8 border-none bg-white dark:bg-slate-900 shadow-sm">
            <CardContent className="p-6">
                <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="What's on your mind?"
                    className="min-h-[100px] resize-none mb-4"
                />
                {keepMediaUrls.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        {keepMediaUrls.map((url, index) => (
                            <div key={url} className="relative">
                                {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                    <img
                                        src={url}
                                        alt={`Media ${index + 1}`}
                                        className="rounded-lg w-full h-32 object-cover"
                                    />
                                ) : url.match(/\.(mp4|webm|ogg)$/i) && (
                                    <video
                                        src={url}
                                        className="rounded-lg w-full h-32 object-cover"
                                        controls
                                    />
                                )}
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-2 right-2 h-6 w-6"
                                    onClick={() => handleRemoveExistingMedia(url)}
                                >
                                    <IconX className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
                {mediaFiles.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mb-4">
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
                                        controls
                                    />
                                )}
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-2 right-2 h-6 w-6"
                                    onClick={() => handleRemoveMedia(index)}
                                >
                                    <IconX className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
                <div className="flex justify-between items-center">
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
                    <div className="flex space-x-2">
                        <Button
                            variant="outline"
                            onClick={() => router.push(`/thread/${post.id}`)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                </div>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileChange}
                    multiple
                    aria-label="Upload media attachments"
                />
            </CardContent>
        </Card>
    )
}