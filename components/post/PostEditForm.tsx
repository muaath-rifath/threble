'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Image, Video, X } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { Session } from 'next-auth'

interface PostEditFormProps {
    post: {
        id: string;
        content: string;
        mediaAttachments: string[];
        author: {
            name: string | null;
            image: string | null;
        };
    };
    session: Session;
}

export default function PostEditForm({ post, session }: PostEditFormProps) {
    const router = useRouter()
    const { toast } = useToast()
    const [editContent, setEditContent] = useState(post.content)
    const [keepMediaUrls, setKeepMediaUrls] = useState<string[]>(post.mediaAttachments || [])
    const [editMediaFiles, setEditMediaFiles] = useState<File[]>([])

    const handleSubmit = async () => {
        try {
            const formData = new FormData();
            formData.append('content', editContent);
            formData.append('keepMediaUrls', keepMediaUrls.join(','));
            
            editMediaFiles.forEach(file => {
                formData.append('mediaAttachments', file);
            });

            const response = await fetch(`/api/posts/${post.id}`, {
                method: 'PATCH',
                body: formData,
            });

            if (response.ok) {
                toast({ 
                    title: "Success", 
                    description: "Post updated successfully." 
                });
                router.push(`/post/${post.id}`);
            } else {
                throw new Error('Failed to update post');
            }
        } catch (error) {
            console.error('Error updating post:', error);
            toast({
                title: "Error",
                description: "Failed to update post. Please try again.",
                variant: "destructive",
            });
        }
    };

    const handleFileSelect = (acceptedTypes: string) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = acceptedTypes;
        input.multiple = true;
        input.onchange = (e: Event) => {
            const files = Array.from((e.target as HTMLInputElement).files || []);
            if (files.length > 0) {
                const invalidFiles = files.filter(file => file.size > 20 * 1024 * 1024);
                if (invalidFiles.length > 0) {
                    toast({
                        title: "Error",
                        description: "Files must be less than 20MB",
                        variant: "destructive",
                    });
                    return;
                }
                setEditMediaFiles(prev => [...prev, ...files]);
            }
        };
        input.click();
    };

    const handleRemoveMedia = (url: string) => {
        setKeepMediaUrls(prev => prev.filter(u => u !== url));
    };

    const handleRemoveNewMedia = (index: number) => {
        setEditMediaFiles(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="max-w-2xl mx-auto mt-8 px-4">
            <Card>
                <CardHeader>
                    <div className="flex items-center space-x-4">
                        <Avatar>
                            <AvatarImage src={post.author.image || undefined} />
                            <AvatarFallback>{post.author.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold">{post.author.name}</p>
                            <p className="text-sm text-gray-500">Editing post</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[100px] mb-4"
                        placeholder="What's on your mind?"
                    />
                    
                    {/* Existing media preview */}
                    {keepMediaUrls.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            {keepMediaUrls.map((url, index) => (
                                <div key={url} className="relative aspect-square">
                                    {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                        <img
                                            src={url}
                                            alt={`Media ${index + 1}`}
                                            className="rounded-lg w-full h-full object-cover"
                                        />
                                    ) : url.match(/\.(mp4|webm|ogg)$/i) && (
                                        <video
                                            src={url}
                                            className="rounded-lg w-full h-full object-cover"
                                            controls
                                        />
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full"
                                        onClick={() => handleRemoveMedia(url)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* New media preview */}
                    {editMediaFiles.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            {editMediaFiles.map((file, index) => (
                                <div key={index} className="relative aspect-square">
                                    {file.type.startsWith('image/') ? (
                                        <img
                                            src={URL.createObjectURL(file)}
                                            alt={`New media ${index + 1}`}
                                            className="rounded-lg w-full h-full object-cover"
                                        />
                                    ) : file.type.startsWith('video/') && (
                                        <video
                                            src={URL.createObjectURL(file)}
                                            className="rounded-lg w-full h-full object-cover"
                                            controls
                                        />
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full"
                                        onClick={() => handleRemoveNewMedia(index)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex justify-between">
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
                    <div className="flex space-x-2">
                        <Button
                            variant="outline"
                            onClick={() => router.back()}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            className="bg-blue-500 hover:bg-blue-600 text-white"
                        >
                            Save Changes
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}