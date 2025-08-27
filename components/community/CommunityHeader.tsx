'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { 
  Users, 
  Lock, 
  Globe, 
  Settings, 
  MessageSquare,
  MoreHorizontal,
  UserPlus,
  ExternalLink
} from 'lucide-react'
import { CommunityWithDetails, CommunityMember } from '@/lib/types'
import { joinCommunity, leaveCommunity } from '@/lib/actions/community.actions'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface CommunityHeaderProps {
  community: CommunityWithDetails
  currentUserMembership?: CommunityMember | null
  onMembershipChange?: () => void
}

export default function CommunityHeader({ 
  community, 
  currentUserMembership,
  onMembershipChange 
}: CommunityHeaderProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const isAdmin = currentUserMembership?.role === 'ADMIN'
  const isModerator = currentUserMembership?.role === 'MODERATOR'
  const isMember = !!currentUserMembership
  const canManage = isAdmin || isModerator

  const handleJoinCommunity = async () => {
    if (!session) {
      router.push('/signin')
      return
    }

    setIsLoading(true)
    try {
      const result = await joinCommunity(community.id)
      
      if (result.success) {
        toast({
          title: "Success",
          description: community.visibility === 'PRIVATE' 
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
    if (!currentUserMembership) return

    setIsLoading(true)
    try {
      const result = await leaveCommunity(community.id)
      
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

  return (
    <div className="relative">
      {/* Cover Image */}
      {community.coverImage && (
        <div className="h-48 md:h-64 relative overflow-hidden rounded-t-lg">
          <img
            src={community.coverImage}
            alt={`${community.name} cover`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/20" />
        </div>
      )}

      {/* Header Content */}
      <div className="relative bg-background border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-end gap-6">
            {/* Community Avatar and Info */}
            <div className="flex items-center gap-4">
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                <AvatarImage src={community.image || ''} alt={community.name} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {community.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold">{community.name}</h1>
                  <Badge variant={community.visibility === 'PRIVATE' ? 'secondary' : 'outline'}>
                    {community.visibility === 'PRIVATE' ? (
                      <>
                        <Lock className="h-3 w-3 mr-1" />
                        Private
                      </>
                    ) : (
                      <>
                        <Globe className="h-3 w-3 mr-1" />
                        Public
                      </>
                    )}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{community._count.members} members</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" />
                    <span>{community._count.posts} posts</span>
                  </div>
                  <span>Created by {community.creator.name}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 ml-auto">
              {session && (
                <>
                  {isMember ? (
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canManage && (
                            <>
                              <DropdownMenuItem onClick={() => router.push(`/communities/${community.name}/settings`)}>
                                <Settings className="h-4 w-4 mr-2" />
                                Community Settings
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/communities/${community.name}/members`)}>
                                <Users className="h-4 w-4 mr-2" />
                                Manage Members
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/communities/${community.name}/invites`)}>
                                <UserPlus className="h-4 w-4 mr-2" />
                                Invite Members
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Share Community
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={handleLeaveCommunity}
                            className="text-destructive focus:text-destructive"
                          >
                            Leave Community
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ) : (
                    <Button 
                      onClick={handleJoinCommunity} 
                      disabled={isLoading}
                    >
                      {isLoading ? 'Loading...' : 
                       community.visibility === 'PRIVATE' ? 'Request to Join' : 'Join Community'}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Description */}
          {community.description && (
            <div className="mt-4">
              <p className="text-muted-foreground">{community.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
