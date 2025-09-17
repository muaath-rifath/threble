/**
 * Community ownership transfer component
 * Allows community owners to transfer ownership to other members
 */

'use client'

import { useState, useEffect } from 'react'
import { 
  transferCommunityOwnership, 
  getEligibleOwnershipTransferMembers, 
  canTransferCommunityOwnership 
} from '@/lib/actions/community.actions'
import { TransferOwnershipDialog } from './TransferOwnershipDialog'

interface OwnershipTransferProps {
  communityId: string
  communityName: string
}

export function OwnershipTransferSection({ communityId, communityName }: OwnershipTransferProps) {
  const [canTransfer, setCanTransfer] = useState(false)
  const [eligibleMembers, setEligibleMembers] = useState<any[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const [isTransferring, setIsTransferring] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Check permissions and load eligible members
  useEffect(() => {
    async function loadData() {
      const permissionCheck = await canTransferCommunityOwnership(communityId)
      setCanTransfer(permissionCheck.canTransfer)
      
      if (permissionCheck.canTransfer) {
        const membersResult = await getEligibleOwnershipTransferMembers(communityId)
        if (membersResult.success) {
          setEligibleMembers(membersResult.members)
        }
      } else {
        setError(permissionCheck.error || 'Cannot transfer ownership')
      }
    }
    
    loadData()
  }, [communityId])

  const handleTransfer = async () => {
    if (!selectedMemberId) {
      setError('Please select a member to transfer ownership to')
      return
    }

    setIsTransferring(true)
    setError('')
    setMessage('')

    try {
      const result = await transferCommunityOwnership(communityId, selectedMemberId)
      
      if (result.success) {
        setMessage(result.message || 'Ownership transferred successfully!')
        // Reset form
        setSelectedMemberId('')
        setCanTransfer(false)
        setEligibleMembers([])
      } else {
        setError(result.error || 'Transfer failed')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsTransferring(false)
    }
  }

  if (!canTransfer || eligibleMembers.length === 0) {
    return (
      <div className="bg-background border border-border rounded-lg p-4">
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Transfer Ownership
        </h3>
        <p className="text-muted-foreground">
          {eligibleMembers.length === 0 
            ? 'You need at least one other member in the community to transfer ownership.'
            : error || 'You cannot transfer ownership of this community.'
          }
        </p>
        {eligibleMembers.length === 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            Invite more members to the community first, then you can transfer ownership to any of them.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="bg-background border border-destructive/20 rounded-lg p-6">
      <div className="flex items-center mb-4">
        <div className="flex-shrink-0">
          <svg className="h-6 w-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-lg font-semibold text-foreground">
            Transfer Community Ownership
          </h3>
          <p className="text-sm text-muted-foreground">
            Transfer ownership of "{communityName}" to another member. They will become the new admin and owner.
          </p>
        </div>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
          <p className="text-green-800 dark:text-green-200">{message}</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-destructive">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="member-select" className="block text-sm font-medium text-foreground mb-2">
            Select new owner (any community member):
          </label>
          <select
            id="member-select"
            value={selectedMemberId}
            onChange={(e) => {
              const memberId = e.target.value
              setSelectedMemberId(memberId)
              const member = eligibleMembers.find(m => m.userId === memberId)
              setSelectedMember(member || null)
            }}
            className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
            disabled={isTransferring}
          >
                        <option value="">Choose a member...</option>
            {eligibleMembers.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.name || member.username} ({member.email})
              </option>
            ))}
          </select>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Important Warning
              </h3>
              <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                <ul className="list-disc list-inside space-y-1">
                  <li>This action cannot be undone</li>
                  <li>You will lose owner privileges and become a regular member</li>
                  <li>The selected member will become the new owner and admin</li>
                  <li>Both you and the new owner will be notified</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          <TransferOwnershipDialog
            communityName={communityName}
            targetMemberName={selectedMember?.name || ''}
            targetMemberUsername={selectedMember?.username || ''}
            onConfirm={handleTransfer}
            isTransferring={isTransferring}
          >
            <button
              disabled={!selectedMemberId || isTransferring}
              className="flex-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-muted disabled:cursor-not-allowed disabled:text-muted-foreground text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
            >
              {isTransferring ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Transferring...
                </span>
              ) : (
                'Transfer Ownership'
              )}
            </button>
          </TransferOwnershipDialog>
        </div>
      </div>
    </div>
  )
}