'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { 
  Search, 
  MoreVertical, 
  UserMinus, 
  Shield, 
  ShieldCheck, 
  Crown,
  MessageCircle,
  UserPlus
} from 'lucide-react'
import { CommunityMember } from '@/lib/types'
import { updateMemberRole } from '@/lib/actions/community.actions'
import { useAppDispatch } from '@/lib/redux/hooks'
import { removeMember, updateMemberRole as updateMemberRoleRedux } from '@/lib/redux/slices/communitiesSlice'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  members: CommunityMember[]
  communityId: string
  communityName: string
  currentUserMembership?: CommunityMember | null
  onMembersChange?: () => void
}

export default function CommunityMemberList({
  members,
  communityId,
  communityName,
  currentUserMembership,
  onMembersChange
}: CommunityMemberListProps) {
  const { data: session } = useSession()
  const { toast } = useToast()
  const dispatch = useAppDispatch()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMember, setSelectedMember] = useState<CommunityMember | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)

  const isCurrentUserAdmin = currentUserMembership?.role === 'ADMIN'
  const isCurrentUserModerator = currentUserMembership?.role === 'MODERATOR'
  const canManageMembers = isCurrentUserAdmin || isCurrentUserModerator

  const filteredMembers = members.filter(member =>
    member.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.user?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
        return <Crown className="h-4 w-4 text-yellow-500" />
      case 'MODERATOR':
        return <Shield className="h-4 w-4 text-blue-500" />
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
            <Shield className="h-5 w-5" />
            Community Members ({members.length})
          </CardTitle>
          
          <div className="flex items-center gap-3">
            {/* Invite Button - visible to all members */}
            {currentUserMembership && (
              <Button
                onClick={() => router.push(`/communities/${encodeURIComponent(communityName)}/invite`)}
                size="sm"
                className="flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Invite
              </Button>
            )}
            
            {/* Search Input */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
        {filteredMembers.map((member) => (
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
                <MessageCircle className="h-4 w-4" />
              </Button>

              {canManageMember(member) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      disabled={actionLoading === member.id}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isCurrentUserAdmin && (
                      <>
                        {member.role === 'USER' && (
                          <DropdownMenuItem
                            onClick={() => handleUpdateRole(member.id, 'MODERATOR')}
                          >
                            <ShieldCheck className="h-4 w-4 mr-2" />
                            Make Moderator
                          </DropdownMenuItem>
                        )}
                        {member.role === 'MODERATOR' && (
                          <DropdownMenuItem
                            onClick={() => handleUpdateRole(member.id, 'USER')}
                          >
                            <Shield className="h-4 w-4 mr-2" />
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
                      <UserMinus className="h-4 w-4 mr-2" />
                      Remove Member
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        ))}

        {filteredMembers.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? 'No members found matching your search.' : 'No members found.'}
          </div>
        )}
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
