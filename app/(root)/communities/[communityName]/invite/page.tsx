'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Search, UserPlus, Users, Send, Check } from 'lucide-react'

interface Connection {
  id: string
  name: string | null
  username: string | null
  image: string | null
  isCommunityMember?: boolean
}

interface CommunityInfo {
  id: string
  name: string
  description: string | null
}

interface CommunityMember {
  userId: string
}

export default function CommunityInvitePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const { toast } = useToast()
  
  const [community, setCommunity] = useState<CommunityInfo | null>(null)
  const [connections, setConnections] = useState<Connection[]>([])
  const [communityMembers, setCommunityMembers] = useState<CommunityMember[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState<string[]>([])
  const [invitedUsers, setInvitedUsers] = useState<string[]>([])
  
  const communityName = params.communityName as string

  // Fetch community info and user connections
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Fetch community details
        const communityResponse = await fetch(`/api/communities?name=${encodeURIComponent(communityName)}`)
        if (!communityResponse.ok) {
          throw new Error('Community not found')
        }
        const communityData = await communityResponse.json()
        setCommunity(communityData.community)
        
        // Fetch user's connections
        const connectionsResponse = await fetch('/api/user/connections')
        let connectionsData: Connection[] = []
        if (connectionsResponse.ok) {
          const data = await connectionsResponse.json()
          // Transform the API response to match our expected format
          connectionsData = (data.connections || []).map((conn: any) => ({
            id: conn.user.id,
            name: conn.user.name,
            username: conn.user.username,
            image: conn.user.image
          }))
        }
        
        // Fetch community members to check who's already a member
        const membersResponse = await fetch(`/api/communities/${communityData.community.id}/members`)
        let membersData: CommunityMember[] = []
        if (membersResponse.ok) {
          membersData = await membersResponse.json()
          setCommunityMembers(membersData)
        }
        
        // Mark connections that are already community members
        const memberIds = new Set(membersData.map(member => member.userId))
        const connectionsWithMemberStatus = connectionsData.map(connection => ({
          ...connection,
          isCommunityMember: memberIds.has(connection.id)
        }))
        
        setConnections(connectionsWithMemberStatus)
        
      } catch (error) {
        console.error('Error fetching data:', error)
        toast({
          title: "Error",
          description: "Failed to load data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [communityName]) // Removed toast from dependencies to prevent infinite re-renders

  const filteredConnections = connections.filter(connection => 
    (connection.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     connection.username?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const availableToInvite = filteredConnections.filter(connection => 
    !connection.isCommunityMember && !invitedUsers.includes(connection.id)
  )

  const handleInvite = async (userId: string, username: string | null) => {
    if (!community || !username) {
      toast({
        title: "Error",
        description: "Username is required to send invitation",
        variant: "destructive",
      })
      return
    }
    
    setInviting(prev => [...prev, userId])
    
    try {
      const response = await fetch(`/api/communities/${community.id}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send invitation')
      }
      
      // Add to invited users list
      setInvitedUsers(prev => [...prev, userId])
      
      toast({
        title: "Success",
        description: "Invitation sent successfully!",
      })
      
    } catch (error) {
      console.error('Error sending invitation:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send invitation",
        variant: "destructive",
      })
    } finally {
      setInviting(prev => prev.filter(id => id !== userId))
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (!community) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Button 
          variant="ghost" 
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h2 className="text-2xl font-bold mb-2">Community Not Found</h2>
            <p className="text-muted-foreground text-center mb-4">
              The community you're looking for doesn't exist or you don't have permission to invite members.
            </p>
            <Button onClick={() => router.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Invite to {community.name}</h1>
          <p className="text-muted-foreground">Invite your connections to join this community</p>
        </div>
      </div>

      {/* Search and Stats */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Your Connections ({filteredConnections.length} total, {availableToInvite.length} available to invite)
            </CardTitle>
            
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search connections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filteredConnections.length === 0 ? (
            <div className="text-center py-8">
              <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No connections available</h3>
              <p className="text-muted-foreground">
                {searchQuery 
                  ? "No connections match your search." 
                  : "You don't have any connections to invite yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredConnections.map((connection) => {
                const isAlreadyMember = connection.isCommunityMember
                const isInvited = invitedUsers.includes(connection.id)
                const isInviting = inviting.includes(connection.id)
                
                return (
                  <div
                    key={connection.id}
                    className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                      isAlreadyMember 
                        ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                        : isInvited 
                        ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarImage src={connection.image || ''} alt={connection.name || ''} />
                        <AvatarFallback>
                          {connection.name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div>
                        <h4 className="font-medium">{connection.name || 'Unknown'}</h4>
                        <p className="text-sm text-muted-foreground">@{connection.username}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {isAlreadyMember ? (
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                          <Check className="h-4 w-4" />
                          <span className="text-sm font-medium">Member</span>
                        </div>
                      ) : isInvited ? (
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                          <Check className="h-4 w-4" />
                          <span className="text-sm font-medium">Invited</span>
                        </div>
                      ) : (
                        <Button
                          onClick={() => handleInvite(connection.id, connection.username)}
                          disabled={isInviting}
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          {isInviting ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4" />
                              Invite
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invited Users Summary */}
      {invitedUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">
              Invitations Sent ({invitedUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You've successfully sent {invitedUsers.length} invitation{invitedUsers.length !== 1 ? 's' : ''} to join {community.name}.
              Invited users will receive notifications and can accept or decline the invitation.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
