import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'

// Types - using the existing reaction structure from PostCard
interface Reaction {
  id: string
  type: string
  userId: string
  user?: {
    id: string
    name: string | null
    image: string | null
  }
}

interface ReactionsState {
  reactions: Record<string, Reaction[]> // postId -> reactions[]
  reactionCounts: Record<string, Record<string, number>> // postId -> { type -> count }
  loading: Record<string, boolean> // postId -> loading
  error: string | null
}

// Async thunks
export const fetchPostReactions = createAsyncThunk(
  'reactions/fetchPostReactions',
  async ({ postId, type }: { postId: string; type?: string }) => {
    const params = new URLSearchParams()
    if (type) params.append('type', type)
    
    const response = await fetch(`/api/posts/${postId}/reactions?${params}`)
    if (!response.ok) throw new Error('Failed to fetch reactions')
    const data = await response.json()
    return { postId, ...data }
  }
)

export const addReaction = createAsyncThunk(
  'reactions/addReaction',
  async ({ postId, type }: { postId: string; type: string }) => {
    const response = await fetch(`/api/posts/${postId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type })
    })
    if (!response.ok) throw new Error('Failed to add reaction')
    const data = await response.json()
    
    // Fetch all reactions for this post to get the complete list
    const reactionsResponse = await fetch(`/api/posts/${postId}/reactions`)
    const reactionsData = await reactionsResponse.json()
    
    return {
      postId,
      reactions: reactionsData.reactions || [],
      reactionCounts: data.counts || {}
    }
  }
)

export const removeReaction = createAsyncThunk(
  'reactions/removeReaction',
  async ({ postId, type, userId }: { postId: string; type: string; userId: string }) => {
    const response = await fetch(`/api/posts/${postId}/reactions?type=${type}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    })
    if (!response.ok) throw new Error('Failed to remove reaction')
    const data = await response.json()
    
    // Fetch all reactions for this post to get the complete updated list
    const reactionsResponse = await fetch(`/api/posts/${postId}/reactions`)
    const reactionsData = await reactionsResponse.json()
    
    return {
      postId,
      userId,
      type,
      reactions: reactionsData.reactions || [],
      reactionCounts: data.counts || {}
    }
  }
)

// Initial state
const initialState: ReactionsState = {
  reactions: {},
  reactionCounts: {},
  loading: {},
  error: null
}

// Slice
const reactionsSlice = createSlice({
  name: 'reactions',
  initialState,
  reducers: {
    // Real-time updates
    updatePostReactions: (state, action: PayloadAction<{
      postId: string
      reactions: Reaction[]
      reactionCounts: Record<string, number>
    }>) => {
      const { postId, reactions, reactionCounts } = action.payload
      state.reactions[postId] = reactions
      state.reactionCounts[postId] = reactionCounts
    },
    addReactionToPost: (state, action: PayloadAction<{
      postId: string
      reaction: Reaction
    }>) => {
      const { postId, reaction } = action.payload
      if (!state.reactions[postId]) {
        state.reactions[postId] = []
      }
      if (!state.reactionCounts[postId]) {
        state.reactionCounts[postId] = {}
      }
      
      // Add reaction
      state.reactions[postId].push(reaction)
      
      // Update count
      if (!state.reactionCounts[postId][reaction.type]) {
        state.reactionCounts[postId][reaction.type] = 0
      }
      state.reactionCounts[postId][reaction.type]++
    },
    removeReactionFromPost: (state, action: PayloadAction<{
      postId: string
      userId: string
      type: string
    }>) => {
      const { postId, userId, type } = action.payload
      
      if (state.reactions[postId]) {
        state.reactions[postId] = state.reactions[postId].filter(
          r => !(r.userId === userId && r.type === type)
        )
      }
      
      if (state.reactionCounts[postId] && state.reactionCounts[postId][type]) {
        state.reactionCounts[postId][type]--
        if (state.reactionCounts[postId][type] <= 0) {
          delete state.reactionCounts[postId][type]
        }
      }
    },
    clearPostReactions: (state, action: PayloadAction<string>) => {
      const postId = action.payload
      delete state.reactions[postId]
      delete state.reactionCounts[postId]
      delete state.loading[postId]
    }
  },
  extraReducers: (builder) => {
    // Fetch reactions
    builder.addCase(fetchPostReactions.pending, (state, action) => {
      const postId = action.meta.arg.postId
      state.loading[postId] = true
      state.error = null
    })
    builder.addCase(fetchPostReactions.fulfilled, (state, action) => {
      const { postId, reactions, reactionCounts } = action.payload
      state.loading[postId] = false
      state.reactions[postId] = reactions
      state.reactionCounts[postId] = reactionCounts
    })
    builder.addCase(fetchPostReactions.rejected, (state, action) => {
      const postId = action.meta.arg.postId
      state.loading[postId] = false
      state.error = action.error.message || 'Failed to fetch reactions'
    })

    // Add reaction
    builder.addCase(addReaction.pending, (state, action) => {
      const postId = action.meta.arg.postId
      state.loading[postId] = true
      state.error = null
    })
    builder.addCase(addReaction.fulfilled, (state, action) => {
      const { postId, reactions, reactionCounts } = action.payload
      state.loading[postId] = false
      
      state.reactions[postId] = reactions
      state.reactionCounts[postId] = reactionCounts
    })
    builder.addCase(addReaction.rejected, (state, action) => {
      const postId = action.meta.arg.postId
      state.loading[postId] = false
      state.error = action.error.message || 'Failed to add reaction'
    })

    // Remove reaction
    builder.addCase(removeReaction.pending, (state, action) => {
      const postId = action.meta.arg.postId
      state.loading[postId] = true
      state.error = null
    })
    builder.addCase(removeReaction.fulfilled, (state, action) => {
      const { postId, reactionCounts, reactions } = action.payload
      state.loading[postId] = false
      
      state.reactions[postId] = reactions
      state.reactionCounts[postId] = reactionCounts
    })
    builder.addCase(removeReaction.rejected, (state, action) => {
      const postId = action.meta.arg.postId
      state.loading[postId] = false
      state.error = action.error.message || 'Failed to remove reaction'
    })
  }
})

export const {
  updatePostReactions,
  addReactionToPost,
  removeReactionFromPost,
  clearPostReactions
} = reactionsSlice.actions
export default reactionsSlice.reducer
