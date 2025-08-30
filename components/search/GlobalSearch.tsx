'use client'

import { useState, useEffect, useCallback } from 'react'
import { useInView } from '@intersection-observer/next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  IconSearch, 
  IconUsersGroup, 
  IconMessage, 
  IconBuilding, 
  IconLoader2,
  IconHeart,
  IconMessageCircle,
  IconMapPin
} from '@tabler/icons-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'

interface SearchResult {
  id: string
  type: 'post' | 'user' | 'community'
  // Post fields
  content?: string
  author?: {
    id: string
    name: string | null
    username: string | null
    image: string | null
  }
  reactions?: Array<{ type: string; userId: string }>
  replyCount?: number
  createdAt?: string
  // User fields
  name?: string
  username?: string
  image?: string
  profile?: {
    bio: string | null
    location: string | null
  }
  userPostCount?: number
  connectionCount?: number
  // Community fields
  description?: string
  visibility?: string
  memberCount?: number
  communityPostCount?: number
}

interface GlobalSearchProps {
  initialQuery?: string
  onResultClick?: (result: SearchResult) => void
}

export default function GlobalSearch({ initialQuery = '', onResultClick }: GlobalSearchProps) {
  const [query, setQuery] = useState(initialQuery)
  const [activeTab, setActiveTab] = useState<'all' | 'posts' | 'users' | 'communities'>('all')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Intersection observer for infinite scroll
  const { ref, inView } = useInView({
    threshold: 0
  })

  const performSearch = useCallback(async (searchQuery: string, searchType: string, isLoadMore = false) => {
    if (!searchQuery.trim()) {
      setResults([])
      setHasMore(false)
      setCursor(null)
      return
    }

    try {
      if (!isLoadMore) {
        setLoading(true)
        setError(null)
      } else {
        setLoadingMore(true)
      }

      const params = new URLSearchParams({
        q: searchQuery.trim(),
        type: searchType,
        limit: '20',
        ...(isLoadMore && cursor && { cursor })
      })

      const response = await fetch(`/api/search?${params}`)
      if (!response.ok) throw new Error('Search failed')
      
      const data = await response.json()
      
      if (!isLoadMore) {
        setResults(data.results)
      } else {
        setResults(prev => [...prev, ...data.results])
      }
      
      setCursor(data.nextCursor)
      setHasMore(data.hasMore)
    } catch (error) {
      console.error('Search error:', error)
      setError('Search failed. Please try again.')
      toast({
        title: "Search Error",
        description: "Failed to perform search. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [cursor, toast])

  // Search effect with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        setCursor(null)
        setHasMore(false)
        performSearch(query, activeTab)
      } else {
        setResults([])
        setHasMore(false)
        setCursor(null)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query, activeTab, performSearch])

  // Infinite scroll effect  
  useEffect(() => {
    if (inView && hasMore && !loading && !loadingMore && activeTab !== 'all') {
      performSearch(query, activeTab, true)
    }
  }, [inView, hasMore, loading, loadingMore, activeTab, query, performSearch])

  const renderPostResult = (result: SearchResult) => (
    <Card key={result.id} className="mb-4">
      <CardContent className="pt-4">
        <div className="flex items-start space-x-3">
          <Link href={`/${result.author?.username}`}>
            <Avatar className="w-10 h-10">
              <AvatarImage src={result.author?.image || ''} />
              <AvatarFallback>
                {result.author?.name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <Link href={`/${result.author?.username}`} className="font-semibold hover:underline">
                {result.author?.name}
              </Link>
              <span className="text-muted-foreground">@{result.author?.username}</span>
              <Badge variant="outline">Post</Badge>
            </div>
            <p className="text-sm mb-2 line-clamp-3">{result.content}</p>
            <div className="flex items-center space-x-4 text-muted-foreground text-sm">
              <div className="flex items-center space-x-1">
                <IconHeart className="w-4 h-4" />
                <span>{result.reactions?.length || 0}</span>
              </div>
              <div className="flex items-center space-x-1">
                <IconMessageCircle className="w-4 h-4" />
                <span>{result.replyCount || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderUserResult = (result: SearchResult) => (
    <Card key={result.id} className="mb-4">
      <CardContent className="pt-4">
        <div className="flex items-center space-x-4">
          <Link href={`/${result.username}`}>
            <Avatar className="w-12 h-12">
              <AvatarImage src={result.image || ''} />
              <AvatarFallback>
                {result.name?.charAt(0)?.toUpperCase() || result.username?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <Link href={`/${result.username}`} className="font-semibold hover:underline">
                {result.name}
              </Link>
              <Badge variant="outline">User</Badge>
            </div>
            <p className="text-muted-foreground text-sm">@{result.username}</p>
            {result.profile?.bio && (
              <p className="text-sm mt-1 line-clamp-2">{result.profile.bio}</p>
            )}
            {result.profile?.location && (
              <div className="flex items-center mt-1 text-muted-foreground text-sm">
                <IconMapPin className="w-3 h-3 mr-1" />
                {result.profile.location}
              </div>
            )}
            <div className="flex items-center space-x-4 mt-2 text-muted-foreground text-sm">
              <span>{result.userPostCount} posts</span>
              <span>{result.connectionCount} connections</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderCommunityResult = (result: SearchResult) => (
    <Card key={result.id} className="mb-4">
      <CardContent className="pt-4">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <IconBuilding className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <Link href={`/communities/${result.name}`} className="font-semibold hover:underline">
                {result.name}
              </Link>
              <Badge variant="outline">Community</Badge>
              <Badge variant={result.visibility === 'PUBLIC' ? 'default' : 'secondary'}>
                {result.visibility}
              </Badge>
            </div>
            {result.description && (
              <p className="text-sm mb-2 line-clamp-2">{result.description}</p>
            )}
            <div className="flex items-center space-x-4 text-muted-foreground text-sm">
              <div className="flex items-center space-x-1">
                <IconUsersGroup className="w-4 h-4" />
                <span>{result.memberCount} members</span>
              </div>
              <div className="flex items-center space-x-1">
                <IconMessage className="w-4 h-4" />
                <span>{result.communityPostCount} posts</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconSearch className="h-5 w-5" />
            Global Search
          </CardTitle>
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search posts, users, and communities..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
      </Card>

      {query.trim() && (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="communities">Communities</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {error ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-destructive mb-4">{error}</p>
                  <Button onClick={() => performSearch(query, activeTab)} variant="outline">
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            ) : loading && results.length === 0 ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="pt-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-muted rounded-full" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-1/3" />
                          <div className="h-3 bg-muted rounded w-full" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <>
                {results.map((result) => {
                  switch (result.type) {
                    case 'post':
                      return renderPostResult(result)
                    case 'user':
                      return renderUserResult(result)
                    case 'community':
                      return renderCommunityResult(result)
                    default:
                      return null
                  }
                })}

                {/* Infinite scroll trigger - only for specific types, not 'all' */}
                {hasMore && activeTab !== 'all' && (
                  <div ref={ref as any} className="py-4">
                    {loadingMore && (
                      <div className="flex justify-center">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <IconLoader2 className="h-5 w-5 animate-spin" />
                          Loading more results...
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Empty state */}
                {results.length === 0 && !loading && (
                  <Card>
                    <CardContent className="text-center py-12">
                      <IconSearch className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">No results found</h3>
                      <p className="text-muted-foreground">
                        Try adjusting your search terms or browse different categories.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
