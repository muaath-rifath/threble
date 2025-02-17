'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Session } from 'next-auth'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ThumbsUp, MessageSquare, Share2 } from 'lucide-react'
import { ExtendedPost } from '@/lib/types'
import MediaContent from './MediaContent'
import PostActions from './PostActions'

interface PostCardProps {
    post: ExtendedPost
    session: Session
    onUpdate: () => void
    isReply?: boolean
    showFullContent?: boolean
}

export default function PostCard({ 
    post, 
    session, 
    onUpdate, 
    isReply = false, 
    showFullContent = false 
}: PostCardProps) {
    const router = useRouter()
    const [isEditing, setIsEditing] = useState(false)

    const handlePostClick = () => {
        if (!showFullContent && !isEditing) {
            router.push(`/post/${post.id}`)
        }
    }

    const handleReaction = async (type: string) => {
        // ...existing reaction logic...
    }

    const handleShare = async () => {
        try {
            await navigator.share({
                title: 'Share Post',
                text: post.content,
                url: `${window.location.origin}/post/${post.id}`
            })
        } catch (error) {
            if ((error as Error).name !== 'AbortError') {
                console.error('Share failed:', error)
            }
        }
    }

    return (
        <Card className={`${isReply ? 'mt-4' : 'mb-8'} border-none bg-white dark:bg-slate-900 shadow-sm ${!showFullContent && !isEditing ? 'cursor-pointer' : ''}`}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <Link 
                        href={`/profile/${post.author.id}`} 
                        className="flex items-center space-x-4 hover:opacity-80 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Avatar>
                            <AvatarImage src={post.author.image || undefined} />
                            <AvatarFallback>{post.author.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{post.author.name}</p>
                            <p className="text-sm text-slate-500">{new Date(post.createdAt).toLocaleString()}</p>
                        </div>
                    </Link>
                    {session.user?.id === post.author.id && (
                        <PostActions 
                            post={post}
                            session={session}
                            onUpdate={onUpdate}
                            isEditing={isEditing}
                            onEditStart={() => setIsEditing(true)}
                            onEditEnd={() => setIsEditing(false)}
                            showInHeader={isEditing}
                        />
                    )}
                </div>
            </CardHeader>
            <CardContent onClick={!isEditing ? handlePostClick : undefined}>
                {post.parentId && post.parent && !isEditing && (
                    <div className="mb-4 italic text-sm text-slate-600 dark:text-slate-400">
                        Replied to{' '}
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/post/${post.parentId}`)
                            }}
                            className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            @{post.parent.author.name}
                        </button>
                    </div>
                )}
                {isEditing ? (
                    <PostActions 
                        post={post}
                        session={session}
                        onUpdate={onUpdate}
                        isEditing={true}
                        onEditStart={() => setIsEditing(true)}
                        onEditEnd={() => setIsEditing(false)}
                    />
                ) : (
                    <>
                        <p className={`text-slate-800 dark:text-slate-200 ${!showFullContent && post.content.length > 200 ? 'line-clamp-3' : ''}`}>
                            {post.content}
                        </p>
                        <MediaContent mediaAttachments={post.mediaAttachments} />
                    </>
                )}
            </CardContent>
            <CardFooter className="flex justify-between border-t border-slate-100 dark:border-slate-800 mt-4 pt-4" onClick={e => e.stopPropagation()}>
                {isEditing ? (
                    <PostActions 
                        post={post}
                        session={session}
                        onUpdate={onUpdate}
                        isEditing={true}
                        onEditStart={() => setIsEditing(true)}
                        onEditEnd={() => setIsEditing(false)}
                        showMediaButtons={true}
                    />
                ) : (
                    <>
                        <Button
                            variant="ghost"
                            onClick={() => handleReaction('LIKE')}
                            className={`post-action-button ${
                                post.reactions.some(r => r.userId === session.user.id && r.type === 'LIKE') 
                                    ? 'post-action-button-active' 
                                    : ''
                            }`}
                        >
                            <ThumbsUp className="h-5 w-5" />
                            <span className="post-action-count">
                                {post.reactions.filter(r => r.type === 'LIKE').length}
                            </span>
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => router.push(`/post/${post.id}`)}
                            className="post-action-button"
                        >
                            <MessageSquare className="h-5 w-5" />
                            <span className="post-action-count">
                                {post._count.replies}
                            </span>
                        </Button>
                        <Button 
                            variant="ghost"
                            onClick={handleShare}
                            className="post-action-button"
                        >
                            <Share2 className="h-5 w-5" />
                            <span>Share</span>
                        </Button>
                    </>
                )}
            </CardFooter>
        </Card>
    )
}