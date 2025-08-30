'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { IconBookmark } from '@tabler/icons-react'
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks'
import { addBookmark, removeBookmark, optimisticAddBookmark, optimisticRemoveBookmark } from '@/lib/redux/slices/bookmarksSlice'
import { useToast } from '@/hooks/use-toast'
import { Session } from 'next-auth'

interface BookmarkButtonProps {
  postId: string
  session: Session
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'ghost' | 'outline' | 'default'
  showCount?: boolean
}

export default function BookmarkButton({ 
  postId, 
  session, 
  className = '', 
  size = 'sm',
  variant = 'ghost',
  showCount = false
}: BookmarkButtonProps) {
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  // Check if post is bookmarked
  const isBookmarked = useAppSelector(state => 
    state.bookmarks.bookmarkedPostIds.includes(postId)
  )
  
  const bookmarksLoading = useAppSelector(state => state.bookmarks.loading)

  const handleToggleBookmark = async () => {
    if (!session?.user?.id || isLoading || bookmarksLoading) return

    console.log('BookmarkButton: Toggling bookmark', { postId, userId: session.user.id, isBookmarked })
    setIsLoading(true)
    
    try {
      if (isBookmarked) {
        // Optimistic update
        dispatch(optimisticRemoveBookmark({ postId }))
        
        // Server update
        await dispatch(removeBookmark({ postId })).unwrap()
        
        toast({
          title: "Bookmark removed",
          description: "Post removed from your bookmarks",
        })
      } else {
        // Optimistic update
        dispatch(optimisticAddBookmark({ postId }))
        
        // Server update
        const result = await dispatch(addBookmark({ postId })).unwrap()
        console.log('BookmarkButton: Bookmark added successfully', result)
        
        toast({
          title: "Post bookmarked",
          description: result.alreadyBookmarked 
            ? "Post was already in your bookmarks" 
            : "Post added to your bookmarks",
        })
      }
    } catch (error) {
      console.error('BookmarkButton: Error toggling bookmark:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      
      toast({
        title: "Error",
        description: `Failed to ${isBookmarked ? 'remove' : 'add'} bookmark: ${errorMessage}`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getIconClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-4 w-4'
      case 'md':
        return 'h-5 w-5'
      case 'lg':
        return 'h-6 w-6'
      default:
        return 'h-5 w-5'
    }
  }

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={handleToggleBookmark}
      disabled={isLoading || bookmarksLoading}
      className={`flex items-center space-x-2 transition-all duration-200 ${className} ${
        isBookmarked 
          ? 'text-primary-500 bg-primary-500/10' 
          : 'text-black/60 dark:text-white/60'
      } ${(isLoading || bookmarksLoading) ? 'opacity-50' : ''}`}
    >
      <IconBookmark 
        className={`${getIconClasses()} ${isBookmarked ? 'fill-current' : ''} transition-all duration-200`} 
      />
      {showCount && (
        <span className="ml-1 text-xs">
          {/* Could add bookmark count here if needed */}
        </span>
      )}
    </Button>
  )
}
