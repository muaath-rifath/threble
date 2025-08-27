import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'

// Types
interface Community {
  id: string
  name: string
  description: string | null
  image: string | null
  coverImage: string | null
  isPrivate: boolean
  memberCount: number
  postCount: number
  createdAt: string
  updatedAt: string
  createdBy: string
  creator: {
    id: string
    name: string | null
    username: string | null
    image: string | null
  }
  isMember: boolean
  isAdmin: boolean
}

interface CommunityMember {
  id: string
  userId: string
  communityId: string
  role: 'USER' | 'MODERATOR' | 'ADMIN'
  joinedAt: string
  user: {
    id: string
    name: string | null
    username: string | null
    image: string | null
  }
}

interface CommunitiesState {
  communities: Community[]
  myCommunities: Community[]
  currentCommunity: Community | null
  communityMembers: Record<string, CommunityMember[]> // communityId -> members
  loading: boolean
  memberLoading: Record<string, boolean> // communityId -> loading
  error: string | null
  hasMore: boolean
  page: number
}

// Async thunks
export const fetchCommunities = createAsyncThunk(
  'communities/fetchCommunities',
  async ({ page = 1, limit = 20 }: { page?: number; limit?: number } = {}) => {
    const response = await fetch(`/api/communities?page=${page}&limit=${limit}`)
    if (!response.ok) throw new Error('Failed to fetch communities')
    const data = await response.json()
    return { ...data, page }
  }
)

export const fetchMyCommunities = createAsyncThunk(
  'communities/fetchMyCommunities',
  async () => {
    const response = await fetch('/api/communities/my-communities')
    if (!response.ok) throw new Error('Failed to fetch my communities')
    return response.json()
  }
)

export const fetchCommunityById = createAsyncThunk(
  'communities/fetchCommunityById',
  async (communityId: string) => {
    const response = await fetch(`/api/communities/${communityId}`)
    if (!response.ok) throw new Error('Failed to fetch community')
    return response.json()
  }
)

export const createCommunity = createAsyncThunk(
  'communities/createCommunity',
  async (communityData: {
    name: string
    description?: string
    image?: string
    coverImage?: string
    isPrivate: boolean
  }) => {
    const response = await fetch('/api/communities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(communityData)
    })
    if (!response.ok) throw new Error('Failed to create community')
    return response.json()
  }
)

export const updateCommunity = createAsyncThunk(
  'communities/updateCommunity',
  async ({ communityId, ...updateData }: {
    communityId: string
    name?: string
    description?: string
    image?: string
    coverImage?: string
    isPrivate?: boolean
  }) => {
    const response = await fetch(`/api/communities/${communityId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    })
    if (!response.ok) throw new Error('Failed to update community')
    return response.json()
  }
)

export const joinCommunity = createAsyncThunk(
  'communities/joinCommunity',
  async (communityId: string) => {
    const response = await fetch(`/api/communities/${communityId}/join`, {
      method: 'POST'
    })
    if (!response.ok) throw new Error('Failed to join community')
    return { communityId, ...await response.json() }
  }
)

export const leaveCommunity = createAsyncThunk(
  'communities/leaveCommunity',
  async (communityId: string) => {
    const response = await fetch(`/api/communities/${communityId}/leave`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Failed to leave community')
    return { communityId, ...await response.json() }
  }
)

export const fetchCommunityMembers = createAsyncThunk(
  'communities/fetchCommunityMembers',
  async (communityId: string) => {
    const response = await fetch(`/api/communities/${communityId}/members`)
    if (!response.ok) throw new Error('Failed to fetch community members')
    const data = await response.json()
    return { communityId, members: data }
  }
)

export const updateMemberRole = createAsyncThunk(
  'communities/updateMemberRole',
  async ({ communityId, userId, role }: {
    communityId: string
    userId: string
    role: 'USER' | 'MODERATOR' | 'ADMIN'
  }) => {
    const response = await fetch(`/api/communities/${communityId}/members/${userId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    })
    if (!response.ok) throw new Error('Failed to update member role')
    return { communityId, userId, role, ...await response.json() }
  }
)

export const removeMember = createAsyncThunk(
  'communities/removeMember',
  async ({ communityId, memberId }: { communityId: string; memberId: string }) => {
    const response = await fetch(`/api/communities/${communityId}/members/${memberId}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Failed to remove member')
    const data = await response.json()
    return { communityId, memberId, ...data }
  }
)

// Initial state
const initialState: CommunitiesState = {
  communities: [],
  myCommunities: [],
  currentCommunity: null,
  communityMembers: {},
  loading: false,
  memberLoading: {},
  error: null,
  hasMore: true,
  page: 1
}

// Slice
const communitiesSlice = createSlice({
  name: 'communities',
  initialState,
  reducers: {
    // Real-time updates
    addCommunity: (state, action: PayloadAction<Community>) => {
      const community = action.payload
      state.communities.unshift(community)
      if (community.isMember) {
        state.myCommunities.unshift(community)
      }
    },
    updateCommunityInState: (state, action: PayloadAction<Community>) => {
      const updatedCommunity = action.payload
      
      // Update in communities list
      const communityIndex = state.communities.findIndex(c => c.id === updatedCommunity.id)
      if (communityIndex !== -1) {
        state.communities[communityIndex] = updatedCommunity
      }
      
      // Update in my communities list
      const myIndex = state.myCommunities.findIndex(c => c.id === updatedCommunity.id)
      if (myIndex !== -1) {
        if (updatedCommunity.isMember) {
          state.myCommunities[myIndex] = updatedCommunity
        } else {
          state.myCommunities.splice(myIndex, 1)
        }
      } else if (updatedCommunity.isMember) {
        state.myCommunities.push(updatedCommunity)
      }
      
      // Update current community
      if (state.currentCommunity?.id === updatedCommunity.id) {
        state.currentCommunity = updatedCommunity
      }
    },
    removeCommunity: (state, action: PayloadAction<string>) => {
      const communityId = action.payload
      state.communities = state.communities.filter(c => c.id !== communityId)
      state.myCommunities = state.myCommunities.filter(c => c.id !== communityId)
      if (state.currentCommunity?.id === communityId) {
        state.currentCommunity = null
      }
      delete state.communityMembers[communityId]
      delete state.memberLoading[communityId]
    },
    setCurrentCommunity: (state, action: PayloadAction<Community | null>) => {
      state.currentCommunity = action.payload
    },
    updateCommunityMemberCount: (state, action: PayloadAction<{
      communityId: string
      increment: number
    }>) => {
      const { communityId, increment } = action.payload
      
      // Update in communities list
      const community = state.communities.find(c => c.id === communityId)
      if (community) {
        community.memberCount += increment
      }
      
      // Update in my communities list
      const myCommunity = state.myCommunities.find(c => c.id === communityId)
      if (myCommunity) {
        myCommunity.memberCount += increment
      }
      
      // Update current community
      if (state.currentCommunity?.id === communityId) {
        state.currentCommunity.memberCount += increment
      }
    },
    addMemberToCommunity: (state, action: PayloadAction<{
      communityId: string
      member: CommunityMember
    }>) => {
      const { communityId, member } = action.payload
      if (!state.communityMembers[communityId]) {
        state.communityMembers[communityId] = []
      }
      state.communityMembers[communityId].push(member)
    },
    removeMemberFromCommunity: (state, action: PayloadAction<{
      communityId: string
      userId: string
    }>) => {
      const { communityId, userId } = action.payload
      if (state.communityMembers[communityId]) {
        state.communityMembers[communityId] = state.communityMembers[communityId]
          .filter(m => m.user.id !== userId)
      }
    },
    updateMemberInCommunity: (state, action: PayloadAction<{
      communityId: string
      userId: string
      role: 'USER' | 'MODERATOR' | 'ADMIN'
    }>) => {
      const { communityId, userId, role } = action.payload
      if (state.communityMembers[communityId]) {
        const member = state.communityMembers[communityId].find(m => m.user.id === userId)
        if (member) {
          member.role = role
        }
      }
    },
    resetCommunities: (state) => {
      state.communities = []
      state.hasMore = true
      state.page = 1
      state.error = null
    }
  },
  extraReducers: (builder) => {
    // Fetch communities
    builder.addCase(fetchCommunities.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(fetchCommunities.fulfilled, (state, action) => {
      const { communities, hasMore, page } = action.payload
      state.loading = false
      
      if (page === 1) {
        state.communities = communities
      } else {
        state.communities.push(...communities)
      }
      
      state.hasMore = hasMore
      state.page = page
    })
    builder.addCase(fetchCommunities.rejected, (state, action) => {
      state.loading = false
      state.error = action.error.message || 'Failed to fetch communities'
    })

    // Fetch my communities
    builder.addCase(fetchMyCommunities.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(fetchMyCommunities.fulfilled, (state, action) => {
      state.loading = false
      state.myCommunities = action.payload
    })
    builder.addCase(fetchMyCommunities.rejected, (state, action) => {
      state.loading = false
      state.error = action.error.message || 'Failed to fetch my communities'
    })

    // Fetch community by ID
    builder.addCase(fetchCommunityById.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(fetchCommunityById.fulfilled, (state, action) => {
      state.loading = false
      state.currentCommunity = action.payload
    })
    builder.addCase(fetchCommunityById.rejected, (state, action) => {
      state.loading = false
      state.error = action.error.message || 'Failed to fetch community'
    })

    // Create community
    builder.addCase(createCommunity.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(createCommunity.fulfilled, (state, action) => {
      const community = action.payload
      state.loading = false
      state.communities.unshift(community)
      state.myCommunities.unshift(community)
    })
    builder.addCase(createCommunity.rejected, (state, action) => {
      state.loading = false
      state.error = action.error.message || 'Failed to create community'
    })

    // Update community
    builder.addCase(updateCommunity.fulfilled, (state, action) => {
      const updatedCommunity = action.payload
      
      const communityIndex = state.communities.findIndex(c => c.id === updatedCommunity.id)
      if (communityIndex !== -1) {
        state.communities[communityIndex] = updatedCommunity
      }
      
      const myIndex = state.myCommunities.findIndex(c => c.id === updatedCommunity.id)
      if (myIndex !== -1) {
        state.myCommunities[myIndex] = updatedCommunity
      }
      
      if (state.currentCommunity?.id === updatedCommunity.id) {
        state.currentCommunity = updatedCommunity
      }
    })

    // Join community
    builder.addCase(joinCommunity.fulfilled, (state, action) => {
      const { communityId } = action.payload
      
      // Update community membership status
      const community = state.communities.find(c => c.id === communityId)
      if (community) {
        community.isMember = true
        community.memberCount += 1
        state.myCommunities.push(community)
      }
      
      if (state.currentCommunity?.id === communityId && state.currentCommunity) {
        state.currentCommunity.isMember = true
        state.currentCommunity.memberCount = state.currentCommunity.memberCount + 1
      }
    })

    // Leave community
    builder.addCase(leaveCommunity.fulfilled, (state, action) => {
      const { communityId } = action.payload
      
      // Update community membership status
      const community = state.communities.find(c => c.id === communityId)
      if (community) {
        community.isMember = false
        community.memberCount = Math.max(0, community.memberCount - 1)
      }
      
      // Remove from my communities
      state.myCommunities = state.myCommunities.filter(c => c.id !== communityId)
      
      if (state.currentCommunity?.id === communityId && state.currentCommunity) {
        state.currentCommunity.isMember = false
        state.currentCommunity.memberCount = Math.max(0, state.currentCommunity.memberCount - 1)
      }
    })

    // Fetch community members
    builder.addCase(fetchCommunityMembers.pending, (state, action) => {
      const communityId = action.meta.arg
      state.memberLoading[communityId] = true
      state.error = null
    })
    builder.addCase(fetchCommunityMembers.fulfilled, (state, action) => {
      const { communityId, members } = action.payload
      state.memberLoading[communityId] = false
      state.communityMembers[communityId] = members
    })
    builder.addCase(fetchCommunityMembers.rejected, (state, action) => {
      const communityId = action.meta.arg
      state.memberLoading[communityId] = false
      state.error = action.error.message || 'Failed to fetch community members'
    })

    // Update member role
    builder.addCase(updateMemberRole.fulfilled, (state, action) => {
      const { communityId, userId, role } = action.payload
      if (state.communityMembers[communityId]) {
        const member = state.communityMembers[communityId].find(m => m.user.id === userId)
        if (member) {
          member.role = role
        }
      }
    })

    // Remove member
    builder.addCase(removeMember.fulfilled, (state, action) => {
      const { communityId, memberId } = action.payload
      if (state.communityMembers[communityId]) {
        state.communityMembers[communityId] = state.communityMembers[communityId]
          .filter(m => m.id !== memberId)
      }
      
      // Update member count
      const community = state.communities.find(c => c.id === communityId)
      if (community) {
        community.memberCount = Math.max(0, community.memberCount - 1)
      }
      
      const myCommunity = state.myCommunities.find(c => c.id === communityId)
      if (myCommunity) {
        myCommunity.memberCount = Math.max(0, myCommunity.memberCount - 1)
      }
      
      if (state.currentCommunity?.id === communityId && state.currentCommunity) {
        state.currentCommunity.memberCount = Math.max(0, state.currentCommunity.memberCount - 1)
      }
    })
  }
})

export const {
  addCommunity,
  updateCommunityInState,
  removeCommunity,
  setCurrentCommunity,
  updateCommunityMemberCount,
  addMemberToCommunity,
  removeMemberFromCommunity,
  updateMemberInCommunity,
  resetCommunities
} = communitiesSlice.actions
export default communitiesSlice.reducer
