/**
 * Type definitions for community ownership transfer functionality
 */

export interface OwnershipTransferResult {
  success: boolean
  error?: string
  message?: string
  community?: {
    id: string
    name: string
    creator: {
      id: string
      name: string | null
      username: string | null
      image: string | null
    }
  }
}

export interface EligibleMember {
  id: string
  userId: string
  name: string | null
  username: string | null
  image: string | null
  email: string | null
  joinedAt: Date
  role: string
}

export interface EligibleMembersResult {
  success: boolean
  error?: string
  members: EligibleMember[]
}

export interface OwnershipPermissionCheck {
  canTransfer: boolean
  isOwner?: boolean
  eligibleMembersCount?: number
  error?: string
}

/**
 * Community ownership transfer functions
 */
export interface CommunityOwnershipActions {
  /**
   * Transfer ownership of a community to another admin member
   * @param communityId - The ID of the community
   * @param newOwnerId - The ID of the user to transfer ownership to
   * @returns Promise<OwnershipTransferResult>
   */
  transferCommunityOwnership: (communityId: string, newOwnerId: string) => Promise<OwnershipTransferResult>

  /**
   * Get list of all members eligible to receive ownership (excluding current owner)
   * @param communityId - The ID of the community
   * @returns Promise<EligibleMembersResult>
   */
  getEligibleOwnershipTransferMembers: (communityId: string) => Promise<EligibleMembersResult>

  /**
   * Check if current user can transfer ownership
   * @param communityId - The ID of the community
   * @returns Promise<OwnershipPermissionCheck>
   */
  canTransferCommunityOwnership: (communityId: string) => Promise<OwnershipPermissionCheck>
}

/**
 * Notification data structures for ownership transfer
 */
export interface OwnershipReceivedNotificationData {
  previousOwnerId: string
  previousOwnerName: string
  communityName: string
  transferDate: string
}

export interface OwnershipTransferredNotificationData {
  newOwnerId: string
  newOwnerName: string
  communityName: string
  transferDate: string
}