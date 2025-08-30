'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { IconUserPlus, IconUserMinus, IconClock, IconCheck } from '@tabler/icons-react'
import { CommunityMember } from '@/lib/types'
import { joinCommunity, leaveCommunity, cancelJoinRequest } from '@/lib/actions/community.actions'

interface MembershipButtonProps {
  communityId: string
  communityName: string
  visibility: 'PUBLIC' | 'PRIVATE'
  currentUserMembership?: CommunityMember | null
  hasJoinRequest?: boolean
  onMembershipChange?: () => void
  size?: 'sm' | 'default' | 'lg'
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
}

export default function MembershipButton({
  communityId,
  communityName,
  visibility,
  currentUserMembership,
  hasJoinRequest = false,
  onMembershipChange,
  size = 'default',
  variant = 'default'
}: MembershipButtonProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const isMember = !!currentUserMembership

  const handleJoinCommunity = async () => {
    if (!session) {
      router.push('/signin')
      return
    }

    setIsLoading(true)
    try {
      const result = await joinCommunity(communityId)
      
      if (result.success) {
        toast({
          title: "Success",
          description: visibility === 'PRIVATE' 
            ? "Join request submitted successfully" 
            : "Successfully joined community",
        })
        onMembershipChange?.()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to join community",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleLeaveCommunity = async () => {
    setIsLoading(true)
    try {
      const result = await leaveCommunity(communityId)
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Left community successfully",
        })
        onMembershipChange?.()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to leave community",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelRequest = async () => {
    setIsLoading(true)
    try {
      const result = await cancelJoinRequest(communityId)
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Join request cancelled",
        })
        onMembershipChange?.()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to cancel request",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Don't show button if user is not authenticated
  if (!session) {
    return (
      <Button 
        size={size} 
        variant={variant}
        onClick={() => router.push('/signin')}
      >
        <IconUserPlus className="h-4 w-4 mr-2" />
        Join Community
      </Button>
    )
  }

  // User is a member
  if (isMember) {
    const roleDisplay = currentUserMembership.role === 'ADMIN' ? 'Owner' : 
                       currentUserMembership.role === 'MODERATOR' ? 'Moderator' : 'Member'

    return (
      <Button 
        size={size} 
        variant="secondary"
        onClick={handleLeaveCommunity}
        disabled={isLoading}
        className="group"
      >
        <IconCheck className="h-4 w-4 mr-2 group-hover:hidden" />
        <IconUserMinus className="h-4 w-4 mr-2 hidden group-hover:block" />
        <span className="group-hover:hidden">{roleDisplay}</span>
        <span className="hidden group-hover:block">Leave</span>
      </Button>
    )
  }

  // User has a pending join request
  if (hasJoinRequest) {
    return (
      <Button 
        size={size} 
        variant="outline"
        onClick={handleCancelRequest}
        disabled={isLoading}
        className="group"
      >
        <IconClock className="h-4 w-4 mr-2 group-hover:hidden" />
        <IconUserMinus className="h-4 w-4 mr-2 hidden group-hover:block" />
        <span className="group-hover:hidden">Requested</span>
        <span className="hidden group-hover:block">Cancel</span>
      </Button>
    )
  }

  // User can join
  return (
    <Button 
      size={size} 
      variant={variant}
      onClick={handleJoinCommunity}
      disabled={isLoading}
    >
      <IconUserPlus className="h-4 w-4 mr-2" />
      {isLoading ? 'Loading...' : 
       visibility === 'PRIVATE' ? 'Request to Join' : 'Join Community'}
    </Button>
  )
}
