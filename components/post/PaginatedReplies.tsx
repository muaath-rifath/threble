'use client'

import { useState, useCallback } from 'react'
import { Session } from 'next-auth'
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll'
import { Button } from '@/components/ui/button'
import { Loader2, MessageSquare } from 'lucide-react'
import ThreadReply from './ThreadReply'

interface PaginatedRepliesProps {
  parentId: string
  session: Session
  onUpdate: () => void
  depth: number
  maxDepth: number
  parentAuthors: string[]
  initialRepliesCount?: number
}

interface Reply {
  id: string
  content: string
  author: {
    id: string
    name: string | null
    username?: string | null
    image: string | null
  }
  createdAt: string
  updatedAt: string
  authorId: string
  parentId: string | null
  communityId: string | null
  mediaAttachments: string[]
  reactions: Array<{
    id: string
    type: string
    userId: string
    user?: {
      id: string
      name: string | null
      image: string | null
    }
  }>
  _count: {
    replies: number
  }
}

export default function PaginatedReplies({
  parentId,
  session,
  onUpdate,
  depth,
  maxDepth,
  parentAuthors,
  initialRepliesCount = 0
}: PaginatedRepliesProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const fetchReplies = useCallback(async (cursor: string | null) => {
    const params = new URLSearchParams({
      limit: '5', // Load 5 replies at a time
      parentId: parentId,
    })
    
    if (cursor) {
      params.append('cursor', cursor)
    }

    const response = await fetch(`/api/posts/${parentId}/replies?${params}`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch replies')
    }

    const result = await response.json()
    
    return {
      data: result.replies || [],
      nextCursor: result.nextCursor || null,
      hasMore: result.hasMore || false
    }
  }, [parentId])

  const {
    data: replies,
    loading,
    hasMore,
    error,
    ref,
    loadMore
  } = useInfiniteScroll<Reply>({
    fetchFunction: fetchReplies,
    enabled: isExpanded,
  })

  if (initialRepliesCount === 0) {
    return null
  }

  if (!isExpanded) {
    return (
      <div className="mt-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(true)}
          className="text-primary-500 hover:text-primary-600 hover:bg-primary-500/10 glass-button text-sm"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Show {initialRepliesCount} {initialRepliesCount === 1 ? 'reply' : 'replies'}
        </Button>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-3 text-red-500 text-sm">
        Failed to load replies. 
        <Button
          variant="ghost"
          size="sm"
          onClick={() => loadMore()}
          className="ml-2 text-red-500 hover:text-red-600"
        >
          Try again
        </Button>
      </div>
    )
  }

  return (
    <div className="mt-3 space-y-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(false)}
        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 glass-button text-sm mb-2"
      >
        Hide replies
      </Button>
      
      {replies.map((reply, index) => (
        <div key={reply.id} className={`${index === replies.length - 1 ? 'mb-0' : 'mb-3'}`}>
          <ThreadReply
            reply={{
              ...reply,
              replies: [] // Don't pass nested replies to avoid recursion, they'll be handled by their own PaginatedReplies
            }}
            session={session}
            onUpdate={onUpdate}
            depth={depth + 1}
            maxDepth={maxDepth}
            parentAuthors={[...parentAuthors]}
          />
          
          {/* Show paginated nested replies if this reply has replies and we haven't reached max depth */}
          {reply._count.replies > 0 && depth + 1 < maxDepth && (
            <div className="ml-6">
              <PaginatedReplies
                parentId={reply.id}
                session={session}
                onUpdate={onUpdate}
                depth={depth + 1}
                maxDepth={maxDepth}
                parentAuthors={[...parentAuthors, reply.author.username || reply.author.name || 'unknown']}
                initialRepliesCount={reply._count.replies}
              />
            </div>
          )}
          
          {/* Show "View full thread" for deeply nested replies */}
          {depth + 1 >= maxDepth && reply._count.replies > 0 && (
            <div className="ml-6 mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = `/thread/${reply.id}`}
                className="text-primary-500 hover:text-primary-600 hover:bg-primary-500/10 glass-button text-sm"
              >
                View full thread →
              </Button>
            </div>
          )}
        </div>
      ))}

      {/* Load more button or loading indicator */}
      {hasMore && (
        <div ref={ref as any} className="flex justify-center py-2">
          {loading ? (
            <div className="flex items-center text-gray-500 text-sm">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading more replies...
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={loadMore}
              className="text-primary-500 hover:text-primary-600 hover:bg-primary-500/10 glass-button text-sm"
            >
              Load more replies
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
