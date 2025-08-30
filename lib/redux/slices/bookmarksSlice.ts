import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

export interface Bookmark {
  id: string
  userId: string
  postId: string
  createdAt: string
  post: {
    id: string
    content: string
    createdAt: string
    updatedAt: string
    authorId: string
    parentId: string | null
    communityId: string | null
    mediaAttachments: string[]
    author: {
      id: string
      name: string | null
      username: string | null
      image: string | null
    }
    community?: {
      id: string
      name: string
      image: string | null
    } | null
    reactions: Array<{
      id: string
      type: string
      userId: string
      postId: string
      createdAt: string
    }>
    _count: {
      replies: number
      reactions: number
    }
    parent?: {
      id: string
      content: string
      author: {
        id: string
        name: string | null
        username: string | null
        image: string | null
      }
    } | null
  }
}

interface BookmarksState {
  bookmarks: Bookmark[]
  loading: boolean
  error: string | null
  hasMore: boolean
  cursor: string | null
  bookmarkedPostIds: string[]
}

// Async thunks
export const fetchBookmarks = createAsyncThunk(
  'bookmarks/fetchBookmarks',
  async ({ cursor, limit = 10 }: { cursor?: string; limit?: number } = {}) => {
    const params = new URLSearchParams()
    if (cursor) params.append('cursor', cursor)
    params.append('limit', limit.toString())
    
    const response = await fetch(`/api/bookmarks?${params}`)
    if (!response.ok) throw new Error('Failed to fetch bookmarks')
    const data = await response.json()
    
    return data
  }
)

export const addBookmark = createAsyncThunk(
  'bookmarks/addBookmark',
  async ({ postId }: { postId: string }) => {
    const response = await fetch('/api/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId })
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      
      // If the post is already bookmarked, treat it as success
      if (response.status === 409 && errorData.error === 'Post already bookmarked') {
        return { postId, alreadyBookmarked: true }
      }
      
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
    }
    const bookmark = await response.json()
    
    return bookmark
  }
)

export const removeBookmark = createAsyncThunk(
  'bookmarks/removeBookmark',
  async ({ postId }: { postId: string }) => {
    const response = await fetch('/api/bookmarks', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId })
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      
      // If the bookmark doesn't exist, treat it as success
      if (response.status === 404 && errorData.error?.includes('not found')) {
        return { postId, notBookmarked: true }
      }
      
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
    }
    
    return { postId }
  }
)

export const checkBookmarkStatus = createAsyncThunk(
  'bookmarks/checkBookmarkStatus',
  async ({ postIds }: { postIds: string[] }) => {
    const response = await fetch('/api/bookmarks/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postIds })
    })
    
    if (!response.ok) throw new Error('Failed to check bookmark status')
    const data = await response.json()
    
    return data.bookmarkedPostIds
  }
)

// New thunk to initialize bookmarks from a list of post IDs
export const initializeBookmarkStatus = createAsyncThunk(
  'bookmarks/initializeBookmarkStatus',
  async ({ postIds }: { postIds: string[] }) => {
    if (!postIds.length) return []
    
    const response = await fetch('/api/bookmarks/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postIds })
    })
    
    if (!response.ok) throw new Error('Failed to initialize bookmark status')
    const data = await response.json()
    
    return data.bookmarkedPostIds
  }
)

// Initial state
const initialState: BookmarksState = {
  bookmarks: [],
  loading: false,
  error: null,
  hasMore: true,
  cursor: null,
  bookmarkedPostIds: []
}

// Slice
const bookmarksSlice = createSlice({
  name: 'bookmarks',
  initialState,
  reducers: {
    clearBookmarks: (state) => {
      state.bookmarks = []
      state.cursor = null
      state.hasMore = true
      state.bookmarkedPostIds = []
    },
    optimisticAddBookmark: (state, action) => {
      const { postId } = action.payload
      if (!state.bookmarkedPostIds.includes(postId)) {
        state.bookmarkedPostIds.push(postId)
      }
    },
    optimisticRemoveBookmark: (state, action) => {
      const { postId } = action.payload
      state.bookmarkedPostIds = state.bookmarkedPostIds.filter(id => id !== postId)
    }
  },
  extraReducers: (builder) => {
    // Fetch bookmarks
    builder.addCase(fetchBookmarks.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(fetchBookmarks.fulfilled, (state, action) => {
      state.loading = false
      const newBookmarks = action.payload.bookmarks || []
      
      if (action.meta.arg?.cursor) {
        // Pagination - append new bookmarks
        state.bookmarks.push(...newBookmarks)
      } else {
        // Initial load - replace bookmarks
        state.bookmarks = newBookmarks
        // Update bookmarked post IDs array
        state.bookmarkedPostIds = newBookmarks.map((b: Bookmark) => b.postId)
      }
      
      state.cursor = action.payload.nextCursor
      state.hasMore = action.payload.hasMore
    })
    builder.addCase(fetchBookmarks.rejected, (state, action) => {
      state.loading = false
      state.error = action.error.message || 'Failed to fetch bookmarks'
    })

    // Add bookmark
    builder.addCase(addBookmark.fulfilled, (state, action) => {
      state.error = null // Clear any previous errors
      const result = action.payload
      
      // Handle the case where bookmark was already created
      if (result.alreadyBookmarked) {
        // Ensure the post ID is in our bookmarked list
        if (!state.bookmarkedPostIds.includes(result.postId)) {
          state.bookmarkedPostIds.push(result.postId)
        }
        return
      }
      
      // Handle normal bookmark creation
      const bookmark = result
      state.bookmarks.unshift(bookmark)
      if (!state.bookmarkedPostIds.includes(bookmark.postId)) {
        state.bookmarkedPostIds.push(bookmark.postId)
      }
    })
    builder.addCase(addBookmark.rejected, (state, action) => {
      // Only revert optimistic update if it's a real error (not "already bookmarked")
      if (!action.error.message?.includes('Post already bookmarked')) {
        const postId = action.meta.arg.postId
        state.bookmarkedPostIds = state.bookmarkedPostIds.filter(id => id !== postId)
      }
      state.error = action.error.message || 'Failed to add bookmark'
    })

    // Remove bookmark
    builder.addCase(removeBookmark.fulfilled, (state, action) => {
      state.error = null // Clear any previous errors
      const result = action.payload
      const postId = result.postId
      
      // Remove from bookmarks and bookmarkedPostIds regardless
      state.bookmarks = state.bookmarks.filter(bookmark => bookmark.postId !== postId)
      state.bookmarkedPostIds = state.bookmarkedPostIds.filter(id => id !== postId)
    })
    builder.addCase(removeBookmark.rejected, (state, action) => {
      // Only revert optimistic update if it's a real error (not "not found")
      if (!action.error.message?.includes('not found')) {
        const postId = action.meta.arg.postId
        if (!state.bookmarkedPostIds.includes(postId)) {
          state.bookmarkedPostIds.push(postId)
        }
      }
      state.error = action.error.message || 'Failed to remove bookmark'
    })

    // Check bookmark status
    builder.addCase(checkBookmarkStatus.fulfilled, (state, action) => {
      state.bookmarkedPostIds = action.payload
    })

    // Initialize bookmark status
    builder.addCase(initializeBookmarkStatus.fulfilled, (state, action) => {
      // Merge with existing bookmarked post IDs to avoid duplicates
      const newBookmarkedIds = action.payload as string[]
      const existingIds = new Set(state.bookmarkedPostIds)
      
      newBookmarkedIds.forEach(id => {
        if (!existingIds.has(id)) {
          state.bookmarkedPostIds.push(id)
        }
      })
    })
  }
})

export const { clearBookmarks, optimisticAddBookmark, optimisticRemoveBookmark } = bookmarksSlice.actions
export default bookmarksSlice.reducer
