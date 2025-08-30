'use client'

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks'
import { fetchBookmarks } from '@/lib/redux/slices/bookmarksSlice'

export default function BookmarkInitializer() {
  const { data: session, status } = useSession()
  const dispatch = useAppDispatch()
  const { bookmarks, loading, bookmarkedPostIds } = useAppSelector(state => state.bookmarks)
  const hasInitialized = useRef(false)

  useEffect(() => {
    // Only fetch bookmarks if:
    // 1. User is authenticated
    // 2. We haven't initialized yet
    // 3. Not currently loading
    // 4. No bookmarks or bookmarked post IDs loaded yet
    if (
      session?.user?.id && 
      status === 'authenticated' &&
      !hasInitialized.current &&
      !loading && 
      bookmarks.length === 0 && 
      bookmarkedPostIds.length === 0
    ) {
      console.log('BookmarkInitializer: Fetching bookmarks for user:', session.user.id)
      hasInitialized.current = true
      dispatch(fetchBookmarks({}))
    }
  }, [session, status, bookmarks.length, bookmarkedPostIds.length, loading, dispatch])

  // Reset initialization flag when user changes
  useEffect(() => {
    if (status === 'unauthenticated' || !session?.user?.id) {
      hasInitialized.current = false
    }
  }, [session?.user?.id, status])

  // This component doesn't render anything
  return null
}
