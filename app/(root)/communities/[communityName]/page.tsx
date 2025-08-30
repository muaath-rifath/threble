'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import CommunityHeader from '@/components/community/CommunityHeader'
import CommunityMemberList from '@/components/community/CommunityMemberList'
import PostCard from '@/components/post/PostCard'
import PostForm from '@/components/PostForm'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { IconArrowLeft, IconUsers, IconFileText, IconChartBar, IconSettings } from '@tabler/icons-react'
import { CommunityWithDetails, CommunityMember, Post } from '@/lib/types'
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks'
import { fetchCommunityMembers } from '@/lib/redux/slices/communitiesSlice'

export default function CommunityPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const dispatch = useAppDispatch()
  const [community, setCommunity] = useState<CommunityWithDetails | null>(null)
  const [currentUserMembership, setCurrentUserMembership] = useState<CommunityMember | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [postsLoading, setPostsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const communityName = params.communityName as string
  
  // Get reactions from Redux store to sync with local posts state
  const allReactions = useAppSelector(state => state.reactions.reactions)
  const reactionCounts = useAppSelector(state => state.reactions.reactionCounts)
  
  // Get members from Redux store and transform to match expected type
  const reduxMembers = useAppSelector(state => 
    community?.id ? state.communities.communityMembers[community.id] || [] : []
  )
  const memberLoading = useAppSelector(state => 
    community?.id ? state.communities.memberLoading[community.id] || false : false
  )
  
  // Transform Redux members to match lib/types.ts CommunityMember interface
  const members = reduxMembers.map(member => ({
    ...member,
    joinedAt: new Date(member.joinedAt) // Convert string to Date
  }))

  useEffect(() => {
    const fetchCommunity = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/communities?name=${encodeURIComponent(communityName)}`)
        
        if (!response.ok) {
          throw new Error('Community not found')
        }
        
        const data = await response.json()
        setCommunity(data.community)
        setCurrentUserMembership(data.userMembership || null)
        
        // Fetch community posts if user is a member or community is public
        if (data.userMembership || data.community.visibility === 'PUBLIC') {
          fetchCommunityPosts(data.community.id)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load community')
      } finally {
        setLoading(false)
      }
    }

    if (communityName) {
      fetchCommunity()
    }
  }, [communityName])

  // Sync reactions from Redux store to local posts state
  useEffect(() => {
    if (posts.length > 0) {
      setPosts(prevPosts => prevPosts.map(post => {
        const reduxReactions = allReactions[post.id]
        if (reduxReactions) {
          return {
            ...post,
            reactions: reduxReactions,
            _count: {
              ...post._count,
              reactions: reduxReactions.filter(r => r.type === 'LIKE').length
            }
          }
        }
        return post
      }))
    }
  }, [allReactions, reactionCounts])

  const fetchCommunityPosts = async (communityId: string) => {
    try {
      setPostsLoading(true)
      const response = await fetch(`/api/communities/${communityId}/posts`)
      
      if (response.ok) {
        const postsData = await response.json()
        setPosts(postsData.posts || [])
      }
    } catch (err) {
      console.error('Failed to fetch community posts:', err)
    } finally {
      setPostsLoading(false)
    }
  }

  const handleMembershipChange = () => {
    // Refetch community data when membership changes
    const fetchUpdatedCommunity = async () => {
      try {
        const response = await fetch(`/api/communities?name=${encodeURIComponent(communityName)}`)
        if (response.ok) {
          const data = await response.json()
          setCommunity(data.community)
          setCurrentUserMembership(data.userMembership || null)
          
          // Refresh posts as well
          if (data.userMembership || data.community.visibility === 'PUBLIC') {
            fetchCommunityPosts(data.community.id)
          }
        }
      } catch (err) {
        console.error('Failed to refresh community data:', err)
      }
    }
    fetchUpdatedCommunity()
  }

  const handlePostCreated = (newPost: any) => {
    // Add the new post to the beginning of the posts array
    setPosts(prevPosts => [newPost, ...prevPosts])
  }

  const handleMembersChange = () => {
    // Refetch members when membership changes (role updates, removals, etc.)
    if (community?.id) {
      dispatch(fetchCommunityMembers(community.id))
    }
  }

  // Fetch members when community is loaded
  useEffect(() => {
    if (community?.id && currentUserMembership) {
      dispatch(fetchCommunityMembers(community.id))
    }
  }, [community?.id, currentUserMembership, dispatch])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error || !community) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/communities')}
          className="mb-4"
        >
          <IconArrowLeft className="h-4 w-4 mr-2" />
          Back to Communities
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h2 className="text-2xl font-bold mb-2">Community Not Found</h2>
            <p className="text-muted-foreground text-center mb-4">
              The community you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Button onClick={() => router.push('/communities')}>
              Browse Communities
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if current user is a moderator/admin/creator
  const isManager = currentUserMembership && ['ADMIN', 'MODERATOR'].includes(currentUserMembership.role) || 
                    community.creatorId === session?.user?.id

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <Button 
        variant="ghost" 
        onClick={() => router.push('/communities')}
        className="mb-4"
      >
        <IconArrowLeft className="h-4 w-4 mr-2" />
        Back to Communities
      </Button>

      <CommunityHeader 
        community={community} 
        currentUserMembership={currentUserMembership}
        onMembershipChange={handleMembershipChange}
      />

      <Tabs defaultValue="posts" className="mt-6">
        <TabsList className={`grid w-full ${isManager ? 'grid-cols-4' : 'grid-cols-2'}`}>
          <TabsTrigger value="posts" className="flex items-center gap-2">
            <IconFileText className="h-4 w-4" />
            Posts
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <IconUsers className="h-4 w-4" />
            Members
          </TabsTrigger>
          {isManager && (
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <IconChartBar className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          )}
          {isManager && (
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <IconSettings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="posts" className="mt-6">
          <div className="space-y-4">
            {/* Show PostForm for members */}
            {currentUserMembership && session && (
              <PostForm 
                communityId={community?.id} 
                onPostCreated={handlePostCreated} 
              />
            )}
            
            {/* Posts List */}
            {postsLoading ? (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                </CardContent>
              </Card>
            ) : posts.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <IconFileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No posts yet</h3>
                    <p className="text-muted-foreground mb-4">
                      {currentUserMembership ? 
                        "Be the first to create a post in this community!" : 
                        "Join this community to see posts and create your own."
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  session={session!}
                  onUpdate={() => fetchCommunityPosts(community?.id || '')}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="members" className="mt-6">
          <CommunityMemberList
            communityId={community?.id || ''}
            communityName={community?.name || ''}
            currentUserMembership={currentUserMembership}
            onMembersChange={handleMembersChange}
          />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">Community analytics will be displayed here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {isManager && (
          <TabsContent value="settings" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">Community settings will be displayed here.</p>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
