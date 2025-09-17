# Community Ownership Transfer Feature

This document describes the community ownership transfer functionality implemented in the Threble application.

## Overview

The community ownership transfer feature allows the current owner (creator) of a community to transfer ownership to any other member of the community. The selected member will become the new owner and admin, while the previous owner becomes a regular member. This ensures continuity of community management when the original owner needs to step down.

## Key Features

### 1. Secure Transfer Process
- Only the current community owner can initiate a transfer
- Target user must be an existing community member
- Cannot transfer ownership to oneself
- All operations are performed within database transactions

### 2. Comprehensive Validation
- Authentication checks
- Ownership verification
- Member role validation
- Community existence validation

### 3. Notification System
- New owner receives `COMMUNITY_OWNERSHIP_RECEIVED` notification
- Previous owner receives `COMMUNITY_OWNERSHIP_TRANSFERRED` notification
- Both notifications include relevant context and metadata

### 4. Activity Logging
- Ownership transfers are logged for audit purposes
- Activity type: `COMMUNITY_OWNERSHIP_TRANSFERRED`

## Functions

### `transferCommunityOwnership(communityId: string, newOwnerId: string)`
Transfers ownership of a community to another member. The target member becomes the new owner and admin.

**Parameters:**
- `communityId`: The ID of the community to transfer
- `newOwnerId`: The ID of the user to receive ownership

**Returns:** `OwnershipTransferResult`

**Example:**
```typescript
const result = await transferCommunityOwnership('community-123', 'user-456')
if (result.success) {
  console.log('Ownership transferred successfully!')
  console.log(`New owner: ${result.community?.creator.name}`)
} else {
  console.error('Transfer failed:', result.error)
}
```

### `getEligibleOwnershipTransferMembers(communityId: string)`
Gets a list of all community members eligible to receive ownership (excludes current owner).

**Parameters:**
- `communityId`: The ID of the community

**Returns:** `EligibleMembersResult`

**Example:**
```typescript
const result = await getEligibleOwnershipTransferMembers('community-123')
if (result.success) {
  console.log(`Found ${result.members.length} eligible members:`)
  result.members.forEach(member => {
    console.log(`- ${member.name} (${member.username})`)
  })
}
```

### `canTransferCommunityOwnership(communityId: string)`
Checks if the current user can transfer ownership of a community.

**Parameters:**
- `communityId`: The ID of the community

**Returns:** `OwnershipPermissionCheck`

**Example:**
```typescript
const check = await canTransferCommunityOwnership('community-123')
if (check.canTransfer) {
  console.log(`Can transfer to ${check.eligibleMembersCount} members`)
} else {
  console.error('Cannot transfer:', check.error)
}
```

## Database Changes

### New Notification Types
Added to `NotificationType` enum:
- `COMMUNITY_OWNERSHIP_RECEIVED`
- `COMMUNITY_OWNERSHIP_TRANSFERRED`

### Migration
```sql
-- Migration: 20250917142929_add_ownership_transfer_notifications
-- Adds new notification types for ownership transfer
```

## Integration with Existing Features

### Leave Community
The existing `leaveCommunity` function prevents the last admin from leaving without transferring ownership first, displaying the message: "Cannot leave: You are the only admin. Please transfer ownership first."

### Role Management
Works seamlessly with the existing `updateMemberRole` function, ensuring proper permission checks and preventing role changes that would leave no admins.

## Security Considerations

1. **Authentication Required**: All functions require valid user sessions
2. **Owner-Only Access**: Only the community creator can initiate transfers
3. **Member Recipients**: Any community member can receive ownership
4. **Transaction Safety**: All database operations use transactions
5. **Audit Trail**: All transfers are logged and tracked

## Error Handling

The functions handle various error scenarios:
- User not authenticated
- Community not found
- Insufficient permissions
- Target user not found or not eligible
- Self-transfer attempts
- Database transaction failures

## UI Integration

The functions are designed to work with UI components by providing:
- Clear success/error messages
- Structured data for dropdowns and lists
- Permission checks for conditional rendering
- Proper path revalidation for immediate UI updates

## Testing

Use the test file at `tests/community-ownership-transfer.test.ts` to verify the functionality works correctly in your environment.

## Type Safety

Type definitions are available in `types/community-ownership.ts` for TypeScript integration.