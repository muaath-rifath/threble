'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { 
  IconSearch, 
  IconDotsVertical, 
  IconUserMinus, 
  IconShield, 
  IconShieldCheck, 
  IconCrown,
  IconMessageCircle,
  IconUserPlus,
  IconLoader2
} from '@tabler/icons-react'
import { CommunityMember } from '@/lib/types'
import { updateMemberRole } from '@/lib/actions/community.actions'
import { useAppDispatch } from '@/lib/redux/hooks'
import { removeMember, updateMemberRole as updateMemberRoleRedux } from '@/lib/redux/slices/communitiesSlice'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface CommunityMemberListProps {
  communityId: string
  communityName: string
  currentUserMembership?: CommunityMember | null
  onMembersChange?: () => void
}

export default function CommunityMemberList({
  communityId,
  communityName,
  currentUserMembership,
  onMembersChange
}: CommunityMemberListProps) {
  const { data: session } = useSession()
  const { toast } = useToast()
  const dispatch = useAppDispatch()
  const router = useRouter()
  
  // UI state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMember, setSelectedMember] = useState<CommunityMember | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)

    // Use ref to store current search query
  const searchQueryRef = useRef(searchQuery)
  
  // Update ref when search query changes
  useEffect(() => {
    searchQueryRef.current = searchQuery
  }, [searchQuery])

  // Stable fetch function that uses ref for current search query
  const fetchMembersForInfiniteScroll = useCallback(async (cursor: string | null) => {
    const params = new URLSearchParams({
      limit: '20',
      ...(searchQueryRef.current && { search: searchQueryRef.current }),
      ...(cursor && { cursor })
    })

    const response = await fetch(`/api/communities/${communityId}/members?${params}`)
    if (!response.ok) throw new Error('Failed to fetch members')
    
    const result = await response.json()
    
    return {
      data: result.data,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore
    }
  }, [communityId])

  // Use infinite scroll hook
  const {
    data: members,
    loading,
    hasMore,
    error,
    ref: loadMoreRef,
    refresh: refreshMembers,
    reset: resetMembers
  } = useInfiniteScroll<CommunityMember>({
    fetchFunction: fetchMembersForInfiniteScroll,
    enabled: true
  })



  // Store refresh function in ref to avoid effect re-runs
  const refreshMembersRef = useRef(refreshMembers)
  refreshMembersRef.current = refreshMembers

  const isCurrentUserAdmin = currentUserMembership?.role === 'ADMIN'
  const isCurrentUserModerator = currentUserMembership?.role === 'MODERATOR'
  const canManageMembers = isCurrentUserAdmin || isCurrentUserModerator

  // Handle search with debounce - refresh when search changes (refresh automatically resets)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      refreshMembersRef.current() // Use ref to get current refresh function
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery]) // Stable dependency array



  const handleUpdateRole = async (memberId: string, newRole: 'USER' | 'MODERATOR' | 'ADMIN') => {
    setActionLoading(memberId)
    try {
      const result = await updateMemberRole(communityId, memberId, newRole)
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Member role updated successfully",
        })
        onMembersChange?.()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update member role",
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
      setActionLoading(null)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    setActionLoading(memberId)
    try {
      const result = await dispatch(removeMember({ communityId, memberId }))
      
      if (result.meta.requestStatus === 'fulfilled') {
        toast({
          title: "Success",
          description: "Member removed successfully",
        })
        onMembersChange?.()
        setShowRemoveDialog(false)
        setSelectedMember(null)
      } else {
        toast({
          title: "Error",
          description: "Failed to remove member",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove member",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <IconCrown className="h-4 w-4 text-yellow-500" />
      case 'MODERATOR':
        return <IconShield className="h-4 w-4 text-blue-500" />
      default:
        return null
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">Owner</Badge>
      case 'MODERATOR':
        return <Badge variant="secondary">Moderator</Badge>
      case 'USER':
        return <Badge variant="outline">Member</Badge>
      default:
        return null
    }
  }

  const canManageMember = (member: CommunityMember) => {
    if (!canManageMembers) return false
    if (member.user?.id === session?.user.id) return false
    if (member.role === 'ADMIN') return false
    if (member.role === 'MODERATOR' && !isCurrentUserAdmin) return false
    return true
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <IconShield className="h-5 w-5" />
            Community Members
          </CardTitle>
          
          <div className="flex items-center gap-3">
            {/* Invite Button - visible to all members */}
            {currentUserMembership && (
              <Button
                onClick={() => router.push(`/communities/${encodeURIComponent(communityName)}/invite`)}
                size="sm"
                className="flex items-center gap-2"
              >
                <IconUserPlus className="h-4 w-4" />
                Invite
              </Button>
            )}
            
            {/* Search Input */}
            <div className="relative w-64">
              <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Error state */}
        {error && (
          <div className="text-center py-8">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => refreshMembers()} variant="outline">
              Try Again
            </Button>
          </div>
        )}

        {/* Loading initial state */}
        {loading && members.length === 0 && (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg animate-pulse">
                <div className="w-10 h-10 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Members list */}
        {!loading || members.length > 0 ? (
          <>
            {/* Deduplicate members by ID to prevent duplicate key errors */}
            {members
              .filter((member, index, arr) => 
                arr.findIndex(m => m.id === member.id) === index
              )
              .map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage src={member.user?.image || ''} alt={member.user?.name || ''} />
                    <AvatarFallback>
                      {member.user?.name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{member.user?.name}</span>
                      {getRoleIcon(member.role)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        @{member.user?.username}
                      </span>
                      {getRoleBadge(member.role)}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Joined {new Date(member.joinedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    <IconMessageCircle className="h-4 w-4" />
                  </Button>

                  {canManageMember(member) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          disabled={actionLoading === member.id}
                        >
                          <IconDotsVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {isCurrentUserAdmin && (
                          <>
                            {member.role === 'USER' && (
                              <DropdownMenuItem
                                onClick={() => handleUpdateRole(member.id, 'MODERATOR')}
                              >
                                <IconShieldCheck className="h-4 w-4 mr-2" />
                                Make Moderator
                              </DropdownMenuItem>
                            )}
                            {member.role === 'MODERATOR' && (
                              <DropdownMenuItem
                                onClick={() => handleUpdateRole(member.id, 'USER')}
                              >
                                <IconShield className="h-4 w-4 mr-2" />
                                Remove Moderator
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedMember(member)
                            setShowRemoveDialog(true)
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <IconUserMinus className="h-4 w-4 mr-2" />
                          Remove Member
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))}

            {/* Infinite scroll trigger */}
            {hasMore && (
              <div ref={loadMoreRef as any} className="py-4">
                {loading && members.length > 0 && (
                  <div className="flex justify-center">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <IconLoader2 className="h-5 w-5 animate-spin" />
                      Loading more members...
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Empty state */}
            {members.length === 0 && !loading && (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'No members found matching your search.' : 'No members found.'}
              </div>
            )}
          </>
        ) : null}
      </CardContent>

      {/* Remove Member Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {selectedMember?.user?.name} from {communityName}? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedMember && handleRemoveMember(selectedMember.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
