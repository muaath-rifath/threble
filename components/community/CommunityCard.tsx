'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { IconUsers, IconLock, IconGlobe, IconMessage } from '@tabler/icons-react'
import { CommunityWithDetails, CommunityMember } from '@/lib/types'
import { joinCommunity } from '@/lib/actions/community.actions'

interface CommunityCardProps {
  community: CommunityWithDetails
  currentUserMembership?: CommunityMember | null
  onMembershipChange?: () => void
}

export default function CommunityCard({ 
  community, 
  currentUserMembership,
  onMembershipChange 
}: CommunityCardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const handleJoinCommunity = async (e: React.MouseEvent) => {
    e.stopPropagation()
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

  const handleCardClick = () => {
    router.push(`/communities/${community.name}`)
  }

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow duration-200"
      onClick={handleCardClick}
    >
      <CardHeader className="pb-2">
        <div className="space-y-3">
          {/* Profile image and name in one row */}
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={community.image || ''} alt={community.name} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {community.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">{community.name}</h3>
            </div>
          </div>
          
          {/* Remaining content below */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={community.visibility === 'PRIVATE' ? 'secondary' : 'outline'}>
                {community.visibility === 'PRIVATE' ? (
                  <>
                    <IconLock className="h-3 w-3 mr-1" />
                    Private
                  </>
                ) : (
                  <>
                    <IconGlobe className="h-3 w-3 mr-1" />
                    Public
                  </>
                )}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3 space-y-3">
        {community.description && (
          <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
            {community.description}
          </p>
        )}
        
        {/* Enhanced stats section */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <IconUsers className="h-4 w-4 text-blue-500" />
            <div>
              <span className="font-medium text-foreground">{community._count.members}</span>
              <span className="text-muted-foreground ml-1">members</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <IconMessage className="h-4 w-4 text-green-500" />
            <div>
              <span className="font-medium text-foreground">{community._count.posts}</span>
              <span className="text-muted-foreground ml-1">posts</span>
            </div>
          </div>
        </div>

        {/* Activity indicator */}
        <div className="flex items-center justify-end pt-2 border-t border-border/50">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-muted-foreground">Active</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-2">
        {currentUserMembership ? (
          <Button 
            variant="secondary" 
            size="sm" 
            className="w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {currentUserMembership.role === 'ADMIN' ? 'Owner' : 
             currentUserMembership.role === 'MODERATOR' ? 'Moderator' : 'Member'}
          </Button>
        ) : (
          <Button 
            size="sm" 
            className="w-full"
            onClick={handleJoinCommunity}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 
             community.visibility === 'PRIVATE' ? 'Request to Join' : 'Join Community'}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
