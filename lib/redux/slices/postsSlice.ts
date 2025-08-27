import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { Post } from '@/components/post/PostCard'
import { addReaction, removeReaction } from './reactionsSlice'

interface PostsState {
  posts: Post[]
  loading: boolean
  error: string | null
  hasMore: boolean
  cursor: string | null
}

// Utility function to deep serialize post dates
const serializePost = (post: any): any => {
  return {
    ...post,
    createdAt: typeof post.createdAt === 'string' ? post.createdAt : post.createdAt.toISOString(),
    updatedAt: typeof post.updatedAt === 'string' ? post.updatedAt : post.updatedAt.toISOString(),
    reactions: post.reactions?.map((r: any) => ({
      ...r,
      createdAt: typeof r.createdAt === 'string' ? r.createdAt : r.createdAt.toISOString()
    })) || [],
    parent: post.parent ? serializePost(post.parent) : null,
    replies: post.replies?.map((reply: any) => serializePost(reply)) || []
  }
}

// Async thunks
export const fetchPosts = createAsyncThunk(
  'posts/fetchPosts',
  async ({ cursor, limit = 10 }: { cursor?: string; limit?: number } = {}) => {
    const params = new URLSearchParams()
    if (cursor) params.append('cursor', cursor)
    params.append('limit', limit.toString())
    
    const response = await fetch(`/api/posts?${params}`)
    if (!response.ok) throw new Error('Failed to fetch posts')
    const data = await response.json()
    
    // Deep serialize all dates to strings recursively
    if (data.posts) {
      data.posts = data.posts.map(serializePost)
    }
    
    return data
  }
)

export const createPost = createAsyncThunk(
  'posts/createPost',
  async ({ content, communityId, mediaAttachments = [] }: {
    content: string
    communityId?: string
    mediaAttachments?: string[]
  }) => {
    const formData = new FormData()
    formData.append('content', content)
    formData.append('visibility', 'public')
    
    if (communityId) {
      formData.append('communityId', communityId)
    }
    
    // Note: mediaAttachments here are expected to be URLs already uploaded
    mediaAttachments.forEach(url => {
      formData.append('mediaUrls', url)
    })

    const response = await fetch('/api/posts', {
      method: 'POST',
      body: formData
    })
    if (!response.ok) throw new Error('Failed to create post')
    const post = await response.json()
    
    // Deep serialize all dates to strings
    return serializePost(post)
  }
)

export const updatePost = createAsyncThunk(
  'posts/updatePost',
  async ({ postId, content }: { postId: string; content: string }) => {
    const response = await fetch(`/api/posts/${postId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    })
    if (!response.ok) throw new Error('Failed to update post')
    const post = await response.json()
    
    // Deep serialize all dates to strings
    return serializePost(post)
  }
)

export const deletePost = createAsyncThunk(
  'posts/deletePost',
  async (postId: string) => {
    const response = await fetch(`/api/posts/${postId}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Failed to delete post')
    return { postId }
  }
)

// Initial state
const initialState: PostsState = {
  posts: [],
  loading: false,
  error: null,
  hasMore: true,
  cursor: null
}

// Slice
const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    // Initialize posts
    setPosts: (state, action: PayloadAction<Post[]>) => {
      state.posts = action.payload
    },
    setInitialPosts: (state, action: PayloadAction<Post[]>) => {
      if (state.posts.length === 0) {
        state.posts = action.payload
      }
    },
    // Real-time updates
    addPost: (state, action: PayloadAction<Post>) => {
      state.posts.unshift(action.payload)
    },
    updatePostInState: (state, action: PayloadAction<Post>) => {
      const index = state.posts.findIndex(post => post.id === action.payload.id)
      if (index !== -1) {
        state.posts[index] = action.payload
      }
    },
    removePost: (state, action: PayloadAction<string>) => {
      state.posts = state.posts.filter(post => post.id !== action.payload)
    },
    updatePostReactions: (state, action: PayloadAction<{ 
      postId: string
      reactions: Post['reactions']
      reactionCounts?: Record<string, number>
    }>) => {
      const post = state.posts.find(p => p.id === action.payload.postId)
      if (post) {
        post.reactions = action.payload.reactions
        if (action.payload.reactionCounts && post._count) {
          post._count.reactions = Object.values(action.payload.reactionCounts).reduce((a, b) => a + b, 0)
        }
      }
    },
    clearPosts: (state) => {
      state.posts = []
      state.cursor = null
      state.hasMore = true
    }
  },
  extraReducers: (builder) => {
    // Fetch posts
    builder.addCase(fetchPosts.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(fetchPosts.fulfilled, (state, action) => {
      state.loading = false
      const newPosts = action.payload.posts || []
      
      if (action.meta.arg?.cursor) {
        // Pagination - append new posts
        state.posts.push(...newPosts)
      } else {
        // Initial load - replace posts
        state.posts = newPosts
      }
      
      state.cursor = action.payload.nextCursor
      state.hasMore = action.payload.hasMore
    })
    builder.addCase(fetchPosts.rejected, (state, action) => {
      state.loading = false
      state.error = action.error.message || 'Failed to fetch posts'
    })

    // Create post
    builder.addCase(createPost.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(createPost.fulfilled, (state, action) => {
      state.loading = false
      if (action.payload) {
        state.posts.unshift(action.payload)
      }
    })
    builder.addCase(createPost.rejected, (state, action) => {
      state.loading = false
      state.error = action.error.message || 'Failed to create post'
    })

    // Update post
    builder.addCase(updatePost.fulfilled, (state, action) => {
      if (action.payload) {
        const index = state.posts.findIndex(post => post.id === action.payload.id)
        if (index !== -1) {
          state.posts[index] = action.payload
        }
      }
    })

    // Delete post
    builder.addCase(deletePost.fulfilled, (state, action) => {
      state.posts = state.posts.filter(post => post.id !== action.payload.postId)
    })
    
    // Listen to reaction changes from reactions slice
    builder.addCase(addReaction.fulfilled, (state, action) => {
      const { postId, reactions, reactionCounts } = action.payload
      const post = state.posts.find(p => p.id === postId)
      if (post) {
        post.reactions = reactions
        if (post._count && reactionCounts) {
          const totalReactions = Object.values(reactionCounts).reduce((total: number, count) => total + (count as number), 0)
          post._count.reactions = totalReactions
        }
      }
    })
    
    builder.addCase(removeReaction.fulfilled, (state, action) => {
      const { postId, reactions, reactionCounts } = action.payload
      const post = state.posts.find(p => p.id === postId)
      if (post) {
        post.reactions = reactions
        if (post._count && reactionCounts) {
          const totalReactions = Object.values(reactionCounts).reduce((total: number, count) => total + (count as number), 0)
          post._count.reactions = totalReactions
        }
      }
    })
  }
})

export const { 
  setPosts,
  setInitialPosts,
  addPost, 
  updatePostInState, 
  removePost, 
  updatePostReactions, 
  clearPosts 
} = postsSlice.actions
export default postsSlice.reducer
