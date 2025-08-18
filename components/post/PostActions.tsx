'use client'

import { useState } from 'react'
import { Session } from 'next-auth'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Edit, Trash2, Image, Video, X } from 'lucide-react'
import { ExtendedPost } from '@/lib/types'
import { deletePost, updatePost } from '@/lib/actions/post.actions'

interface PostActionsProps {
    post: ExtendedPost
    session: Session
    onUpdate: () => void
    onEditStart?: () => void
    onEditEnd?: () => void
    isEditing?: boolean
    showInHeader?: boolean
    showMediaButtons?: boolean
}

export default function PostActions({ 
    post, 
    session, 
    onUpdate, 
    onEditStart, 
    onEditEnd,
    isEditing = false,
    showInHeader = false,
    showMediaButtons = false
}: PostActionsProps) {
    const router = useRouter()
    const { toast } = useToast()
    const [isDeleting, setIsDeleting] = useState(false)
    const [editContent, setEditContent] = useState(post.content)
    const [keepMediaUrls, setKeepMediaUrls] = useState<string[]>(post.mediaAttachments || [])
    const [editMediaFiles, setEditMediaFiles] = useState<File[]>([])

    const isAuthor = session.user?.id === post.author.id

    const handleEdit = async () => {
        if (!isAuthor) return

        try {
            const formData = new FormData()
            formData.append('content', editContent)
            formData.append('keepMediaUrls', keepMediaUrls.join(','))
            
            editMediaFiles.forEach(file => {
                formData.append('mediaAttachments', file)
            })

            const result = await updatePost(post.id, formData)

            if (!result.success) {
                throw new Error(result.error)
            }

            toast({ 
                title: "Success", 
                description: "Post updated successfully." 
            })
            onEditEnd?.()
            onUpdate()
            router.refresh()
        } catch (error: any) {
            console.error('Error updating post:', error)
            toast({
                title: "Error",
                description: error.message || "Failed to update post. Please try again.",
                variant: "destructive",
            })
        }
    }

    const handleDelete = async () => {
        if (!isAuthor) return

        try {
            const result = await deletePost(post.id)

            if (!result.success) {
                throw new Error(result.error)
            }

            toast({ 
                title: "Success", 
                description: "Post deleted successfully." 
            })
            setIsDeleting(false)
            onUpdate()
            router.refresh()

            // If we're on the thread detail page, redirect to home
            if (window.location.pathname === `/thread/${post.id}`) {
                router.push('/')
            }
        } catch (error: any) {
            console.error('Error deleting post:', error)
            toast({
                title: "Error",
                description: error.message || "Failed to delete post. Please try again.",
                variant: "destructive",
            })
        }
    }

    const handleFileSelect = (acceptedTypes: string) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = acceptedTypes
        input.multiple = true
        input.onchange = (e: Event) => {
            const files = Array.from((e.target as HTMLInputElement).files || [])
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
                setEditMediaFiles(prev => [...prev, ...files])
            }
        }
        input.click()
    }

    if (!isAuthor) return null

    if (showInHeader && isEditing) {
        return (
            <div className="flex space-x-2">
                <Button
                    variant="ghost"
                    onClick={onEditEnd}
                    size="sm"
                    className="post-edit-cancel-btn"
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleEdit}
                    size="sm"
                    className="post-edit-save-btn"
                >
                    Save
                </Button>
            </div>
        )
    }

    if (showMediaButtons && isEditing) {
        return (
            <div className="flex space-x-2">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleFileSelect('image/*')}
                    className="post-media-attachment-btn"
                >
                    <Image className="h-4 w-4" />
                    <span>Photo</span>
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleFileSelect('video/*')}
                    className="post-media-attachment-btn"
                >
                    <Video className="h-4 w-4" />
                    <span>Video</span>
                </Button>
            </div>
        )
    }

    if (!isEditing) {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 p-0"
                    >
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onEditStart}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                        onClick={() => setIsDeleting(true)}
                        className="text-red-600 dark:text-red-400"
                    >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        )
    }

    return (
        <div className="flex flex-col w-full">
            <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="post-edit-textarea"
                placeholder="What's on your mind?"
            />
            {keepMediaUrls.length > 0 && (
                <div className={`post-media-grid grid ${keepMediaUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {keepMediaUrls.map((url, index) => (
                        <div key={url} className={`post-media-item ${
                            keepMediaUrls.length === 1 ? 'aspect-auto max-h-[512px]' : 'aspect-square'
                        }`}>
                            {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                <img
                                    src={url}
                                    alt={`Media ${index + 1}`}
                                    className={`w-full h-full ${
                                        keepMediaUrls.length === 1 ? 'object-contain' : 'object-cover'
                                    }`}
                                />
                            ) : url.match(/\.(mp4|webm|ogg)$/i) && (
                                <video
                                    src={url}
                                    className="w-full h-full object-cover"
                                    controls
                                />
                            )}
                            <button
                                type="button"
                                onClick={() => setKeepMediaUrls(prev => prev.filter(u => u !== url))}
                                className="post-media-delete"
                                aria-label="Remove media"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            {editMediaFiles.length > 0 && (
                <div className={`post-media-grid grid ${editMediaFiles.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {editMediaFiles.map((file, index) => (
                        <div key={index} className="post-media-item aspect-square">
                            {file.type.startsWith('image/') ? (
                                <img
                                    src={URL.createObjectURL(file)}
                                    alt={`New media ${index + 1}`}
                                    className="w-full h-full object-cover"
                                />
                            ) : file.type.startsWith('video/') && (
                                <video
                                    src={URL.createObjectURL(file)}
                                    className="w-full h-full object-cover"
                                    controls
                                />
                            )}
                            <button
                                type="button"
                                onClick={() => setEditMediaFiles(prev => prev.filter((_, i) => i !== index))}
                                className="post-media-delete"
                                aria-label="Remove media"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
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
                            onClick={handleDelete}
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