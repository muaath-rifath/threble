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
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll'

export default function CommunityPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const dispatch = useAppDispatch()
  const [community, setCommunity] = useState<CommunityWithDetails | null>(null)
  const [currentUserMembership, setCurrentUserMembership] = useState<CommunityMember | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const communityName = params.communityName as string

  // Fetch function for infinite scroll
  const fetchCommunityPosts = async (cursor: string | null) => {
    if (!community?.id) {
      throw new Error('Community not loaded')
    }

    const url = new URL(`/api/communities/${community.id}/posts`, window.location.origin)
    if (cursor) {
      url.searchParams.set('cursor', cursor)
    }

    const response = await fetch(url.toString())
    
    if (!response.ok) {
      throw new Error('Failed to fetch community posts')
    }

    const data = await response.json()
    
    // Filter out posts with missing author data to prevent runtime errors
    const validPosts = (data.posts || []).filter((post: any) => 
      post && post.id && post.author && post.author.id
    )

    return {
      data: validPosts,
      nextCursor: data.nextCursor,
      hasMore: data.hasNextPage || false
    }
  }

  // Initialize infinite scroll for posts
  const {
    data: posts,
    loading: postsLoading,
    hasMore: hasMorePosts,
    error: postsError,
    ref: loadMoreRef,
    refresh: refreshPosts,
    reset: resetPosts
  } = useInfiniteScroll<Post>({
    fetchFunction: fetchCommunityPosts,
    enabled: !!community?.id && (!!currentUserMembership || community?.visibility === 'PUBLIC')
  })
  
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
  // Ensure reduxMembers is an array before calling map
  const members = Array.isArray(reduxMembers) ? reduxMembers.map(member => ({
    ...member,
    joinedAt: new Date(member.joinedAt) // Convert string to Date
  })) : []

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
        
        // Posts will be loaded automatically by the infinite scroll hook
        // when community and membership data is available
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

  // Note: Redux sync for reactions will be handled differently with infinite scroll
  // We'll refresh the posts when reactions change instead of modifying them directly

  const handleMembershipChange = () => {
    // Refetch community data when membership changes
    const fetchUpdatedCommunity = async () => {
      try {
        const response = await fetch(`/api/communities?name=${encodeURIComponent(communityName)}`)
        if (response.ok) {
          const data = await response.json()
          setCommunity(data.community)
          setCurrentUserMembership(data.userMembership || null)
          
          // Refresh posts with infinite scroll
          if (data.userMembership || data.community.visibility === 'PUBLIC') {
            refreshPosts()
          }
        }
      } catch (err) {
        console.error('Failed to refresh community data:', err)
      }
    }
    fetchUpdatedCommunity()
  }

  const handlePostCreated = (newPost: any) => {
    // Validate the post data
    if (!newPost || !newPost.id || !newPost.author) {
      console.error('Invalid post data received:', newPost)
      return
    }
    
    // Refresh the posts to include the new post
    // This ensures proper ordering and prevents any issues with manual array manipulation
    refreshPosts()
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
            {postsLoading && posts.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                </CardContent>
              </Card>
            ) : posts.length === 0 && !postsLoading ? (
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
              <div key="posts-list">
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    session={session!}
                    onUpdate={refreshPosts}
                  />
                ))}
                
                {/* Loading indicator and scroll trigger */}
                {hasMorePosts && (
                  <div ref={loadMoreRef as any} className="flex justify-center py-8">
                    {postsLoading && (
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    )}
                  </div>
                )}

                {/* Show error if there is one */}
                {postsError && (
                  <Card className="mt-4">
                    <CardContent className="p-6">
                      <div className="text-center text-red-500">
                        <p>Error loading posts: {postsError}</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={refreshPosts}
                          className="mt-2"
                        >
                          Try Again
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Show end message when no more posts */}
                {!hasMorePosts && posts.length > 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>You've reached the end of the posts</p>
                  </div>
                )}
              </div>
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
