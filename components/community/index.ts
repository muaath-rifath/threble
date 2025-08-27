// Community Components
export { default as CommunityCard } from './CommunityCard'
export { default as CommunityForm } from './CommunityForm'
export { default as CommunityHeader } from './CommunityHeader'
export { default as MembershipButton } from './MembershipButton'
export { default as CommunityMemberList } from './CommunityMemberList'
export { default as YourCommunities } from './YourCommunities'

// Phase 6: Advanced Community Features - Component Exports

// Core Management Components
export { default as BulkInviteModal } from './BulkInviteModal'
export { default as ModerationDashboard } from './ModerationDashboard'
export { default as CommunityAnalytics } from './CommunityAnalytics'
export { default as AdvancedCommunitySearch } from './AdvancedCommunitySearch'
export { default as EnhancedCommunityManagement } from './EnhancedCommunityManagement'

// Integrated Hub Component
export { default as CommunityHub } from './CommunityHub'

// Type definitions for external use
export interface CommunityData {
    id: string
    name: string
    description: string | null
    imageUrl: string | null
    isPrivate: boolean
    category: string | null
    memberCount: number
    postCount: number
    createdAt: string
    creatorId: string
}

export interface UserRole {
    role: 'creator' | 'admin' | 'moderator' | 'member'
}

export interface InvitationResult {
    id: string
    username: string
    name: string | null
    status: 'success' | 'already_member' | 'already_invited' | 'not_found' | 'error'
}

export interface ModerationStats {
    period: string
    stats: {
        members: { new: number; growth: string | null }
        posts: { new: number; growth: string | null }
        pendingRequests: number
        pendingInvitations: number
    }
}

export interface AnalyticsData {
    memberGrowth: Array<{ date: string; count: number }>
    postActivity: Array<{ date: string; count: number }>
    engagement: {
        totalPosts: number
        totalReactions: number
        totalReplies: number
        avgReactionsPerPost: number
        avgRepliesPerPost: number
    }
}
