'use client'

import { useEffect, useCallback } from 'react'
import { Session } from 'next-auth'
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks'
import { fetchBookmarks } from '@/lib/redux/slices/bookmarksSlice'
import { useInView } from '@intersection-observer/next'
import PostCard, { Post } from '@/components/post/PostCard'
import { IconLoader2, IconBookmark } from '@tabler/icons-react'

interface BookmarksListProps {
  session: Session
}

// Transform bookmark post to match PostCard Post interface
const transformBookmarkPost = (bookmarkPost: any): Post => {
  return {
    id: bookmarkPost.id,
    content: bookmarkPost.content,
    createdAt: bookmarkPost.createdAt,
    updatedAt: bookmarkPost.updatedAt,
    mediaAttachments: bookmarkPost.mediaAttachments || [],
    author: {
      id: bookmarkPost.author.id,
      name: bookmarkPost.author.name,
      username: bookmarkPost.author.username,
      image: bookmarkPost.author.image,
    },
    reactions: bookmarkPost.reactions || [],
    _count: {
      replies: bookmarkPost._count?.replies || 0,
      reactions: bookmarkPost._count?.reactions || 0,
    },
    parent: bookmarkPost.parent ? {
      id: bookmarkPost.parent.id,
      author: {
        id: bookmarkPost.parent.author.id,
        name: bookmarkPost.parent.author.name,
        username: bookmarkPost.parent.author.username,
      }
    } : undefined,
  }
}

export default function BookmarksList({ session }: BookmarksListProps) {
  const dispatch = useAppDispatch()
  const { bookmarks, loading, error, hasMore, cursor } = useAppSelector(state => state.bookmarks)

  // Intersection observer for infinite scroll
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: '100px'
  })

  // Load more bookmarks when scroll trigger is in view
  const loadMore = useCallback(async () => {
    if (!loading && hasMore && cursor) {
      dispatch(fetchBookmarks({ cursor, limit: 10 }))
    }
  }, [dispatch, loading, hasMore, cursor])

  // Trigger load more when in view
  useEffect(() => {
    if (inView && hasMore && !loading) {
      loadMore()
    }
  }, [inView, hasMore, loading, loadMore])

  // Initial load - only run once
  useEffect(() => {
    if (bookmarks.length === 0) {
      dispatch(fetchBookmarks({ limit: 10 }))
    }
  }, []) // Empty dependency array to run only once

  if (loading && bookmarks.length === 0) {
    return (
      <div className="flex justify-center items-center py-8">
        <IconLoader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading bookmarks...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Error: {error}</p>
      </div>
    )
  }

  if (bookmarks.length === 0 && !loading) {
    return (
      <div className="text-center py-12">
        <IconBookmark className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          No bookmarks yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Bookmarked posts will appear here
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {bookmarks.map((bookmark) => (
          <div key={bookmark.id} className="relative">
            <PostCard 
              post={transformBookmarkPost(bookmark.post)} 
              session={session} 
              onUpdate={() => {
                // Refresh bookmarks if post is updated
                dispatch(fetchBookmarks({ limit: 10 }))
              }}
            />
            {/* Bookmark indicator */}
            <div className="absolute top-2 right-2">
              <IconBookmark className="h-4 w-4 text-green-500 dark:text-green-400 fill-current" />
            </div>
          </div>
        ))}

        {/* Loading indicator for infinite scroll */}
        {hasMore && (
          <div 
            ref={loadMoreRef as any} 
            className="flex justify-center items-center py-4"
          >
            {loading ? (
              <>
                <IconLoader2 className="h-5 w-5 animate-spin" />
                <span className="ml-2">Loading more...</span>
              </>
            ) : (
              <span className="text-gray-500">Scroll to load more</span>
            )}
          </div>
        )}

        {!hasMore && bookmarks.length > 0 && (
          <div className="text-center py-4 text-gray-500">
            You've reached the end
          </div>
        )}
      </div>
    </div>
  )
}
