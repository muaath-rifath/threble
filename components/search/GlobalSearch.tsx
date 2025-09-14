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
  IconMapPin,
  IconX
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
  const [searchQuery, setSearchQuery] = useState(initialQuery) // The actual query being searched
  const [activeTab, setActiveTab] = useState<'all' | 'posts' | 'users' | 'communities'>('all')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const { toast } = useToast()

  // Intersection observer for infinite scroll
  const { ref, inView } = useInView({
    threshold: 0
  })

  const performSearch = useCallback(async (query: string, searchType: string, isLoadMore = false) => {
    if (!query.trim()) {
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
        q: query.trim(),
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

  const handleSearch = useCallback(() => {
    if (query.trim() && !loading) {
      setSearchQuery(query)
      setCursor(null)
      setHasMore(false)
      setHasSearched(true)
      performSearch(query, activeTab)
    }
  }, [query, activeTab, performSearch, loading])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }, [handleSearch])

  // Handle tab change - only if we have already searched and user explicitly clicks a different tab
  useEffect(() => {
    if (hasSearched && searchQuery.trim() && activeTab !== 'all') {
      setCursor(null)
      setHasMore(false)
      performSearch(searchQuery, activeTab)
    }
  }, [activeTab])

  // Infinite scroll effect  
  useEffect(() => {
    if (inView && hasMore && !loading && !loadingMore && activeTab !== 'all') {
      performSearch(searchQuery, activeTab, true)
    }
  }, [inView, hasMore, loading, loadingMore])

  const renderPostResult = (result: SearchResult) => (
    <div key={result.id} className="p-4 bg-glassmorphism dark:bg-glassmorphism-dark backdrop-blur-xl border border-glass-border dark:border-glass-border-dark rounded-2xl shadow-xl mb-4 hover:border-primary-500/50 hover:bg-white/20 dark:hover:bg-white/10 transition-all duration-200 group">
      <div className="flex items-start space-x-3">
        <Link href={`/${result.author?.username}`}>
          <Avatar className="w-10 h-10 ring-2 ring-transparent group-hover:ring-primary-500/30 transition-all duration-200">
            <AvatarImage src={result.author?.image || ''} />
            <AvatarFallback className="bg-primary-500/10 text-primary-500">
              {result.author?.name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <Link href={`/${result.author?.username}`} className="font-semibold hover:underline text-black dark:text-white group-hover:text-primary-500 transition-colors duration-200">
              {result.author?.name}
            </Link>
            <span className="text-black/60 dark:text-white/60 text-sm">@{result.author?.username}</span>
            <Badge variant="secondary" className="bg-primary-500/10 text-primary-500">
              <IconMessage className="w-3 h-3 mr-1" />
              Post
            </Badge>
          </div>
          <p className="text-sm mb-3 line-clamp-3 leading-relaxed text-black/80 dark:text-white/80">{result.content}</p>
          <div className="flex items-center space-x-4 text-black/60 dark:text-white/60 text-sm">
            <div className="flex items-center space-x-1 hover:text-primary-500 transition-colors">
              <IconHeart className="w-4 h-4" />
              <span>{result.reactions?.length || 0}</span>
            </div>
            <div className="flex items-center space-x-1 hover:text-primary-500 transition-colors">
              <IconMessageCircle className="w-4 h-4" />
              <span>{result.replyCount || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderUserResult = (result: SearchResult) => (
    <div key={result.id} className="p-4 bg-glassmorphism dark:bg-glassmorphism-dark backdrop-blur-xl border border-glass-border dark:border-glass-border-dark rounded-2xl shadow-xl mb-4 hover:border-primary-500/50 hover:bg-white/20 dark:hover:bg-white/10 transition-all duration-200 group">
      <div className="flex items-start space-x-4">
        <Link href={`/${result.username}`}>
          <Avatar className="w-12 h-12 ring-2 ring-transparent group-hover:ring-primary-500/30 transition-all duration-200">
            <AvatarImage src={result.image || ''} />
            <AvatarFallback className="bg-primary-500/10 text-primary-500">
              {result.name?.charAt(0)?.toUpperCase() || result.username?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <Link href={`/${result.username}`} className="font-semibold hover:underline text-black dark:text-white group-hover:text-primary-500 transition-colors duration-200">
              {result.name}
            </Link>
            <Badge variant="secondary" className="bg-primary-500/10 text-primary-500">
              <IconUsersGroup className="w-3 h-3 mr-1" />
              User
            </Badge>
          </div>
          <p className="text-black/60 dark:text-white/60 text-sm mb-1">@{result.username}</p>
          {result.profile?.bio && (
            <p className="text-sm mt-2 line-clamp-2 text-black/80 dark:text-white/80 leading-relaxed">{result.profile.bio}</p>
          )}
          {result.profile?.location && (
            <div className="flex items-center mt-2 text-black/60 dark:text-white/60 text-sm">
              <IconMapPin className="w-3 h-3 mr-1 text-primary-500" />
              {result.profile.location}
            </div>
          )}
          <div className="flex items-center space-x-6 mt-3 text-black/60 dark:text-white/60 text-sm">
            <div className="flex items-center space-x-1">
              <IconMessage className="w-4 h-4 text-primary-500" />
              <span className="font-medium">{result.userPostCount}</span>
              <span>posts</span>
            </div>
            <div className="flex items-center space-x-1">
              <IconUsersGroup className="w-4 h-4 text-primary-500" />
              <span className="font-medium">{result.connectionCount}</span>
              <span>connections</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderCommunityResult = (result: SearchResult) => (
    <div key={result.id} className="p-4 bg-glassmorphism dark:bg-glassmorphism-dark backdrop-blur-xl border border-glass-border dark:border-glass-border-dark rounded-2xl shadow-xl mb-4 hover:border-primary-500/50 hover:bg-white/20 dark:hover:bg-white/10 transition-all duration-200 group">
      <div className="flex items-start space-x-4">
        <div className="w-12 h-12 bg-primary-500 rounded-lg flex items-center justify-center ring-2 ring-transparent group-hover:ring-primary-500/30 transition-all duration-200">
          <IconBuilding className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <Link href={`/communities/${result.name}`} className="font-semibold hover:underline text-black dark:text-white group-hover:text-primary-500 transition-colors duration-200">
              {result.name}
            </Link>
            <Badge variant="secondary" className="bg-primary-500/10 text-primary-500">
              <IconBuilding className="w-3 h-3 mr-1" />
              Community
            </Badge>
            <Badge variant={result.visibility === 'PUBLIC' ? 'default' : 'secondary'} 
                   className={result.visibility === 'PUBLIC' 
                     ? 'bg-primary-500/10 text-primary-500' 
                     : 'bg-black/10 dark:bg-white/10 text-black/60 dark:text-white/60'}>
              {result.visibility}
            </Badge>
          </div>
          {result.description && (
            <p className="text-sm mb-3 line-clamp-2 text-black/80 dark:text-white/80 leading-relaxed">{result.description}</p>
          )}
          <div className="flex items-center space-x-6 text-black/60 dark:text-white/60 text-sm">
            <div className="flex items-center space-x-1">
              <IconUsersGroup className="w-4 h-4 text-primary-500" />
              <span className="font-medium">{result.memberCount}</span>
              <span>members</span>
            </div>
            <div className="flex items-center space-x-1">
              <IconMessage className="w-4 h-4 text-primary-500" />
              <span className="font-medium">{result.communityPostCount}</span>
              <span>posts</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="bg-glassmorphism dark:bg-glassmorphism-dark backdrop-blur-xl border border-glass-border dark:border-glass-border-dark rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <IconSearch className="h-5 w-5 text-primary-500" />
          <h3 className="text-heading4-medium text-black dark:text-white">Global Search</h3>
        </div>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-black/60 dark:text-white/60" />
            <Input
              placeholder="Search posts, users, and communities..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-9 pr-9 h-11 bg-white/50 dark:bg-white/5 border-black/10 dark:border-white/10 focus:border-primary-500 focus:ring-primary-500/20 text-black dark:text-white placeholder:text-black/50 dark:placeholder:text-white/50"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('')
                  setSearchQuery('')
                  setResults([])
                  setHasSearched(false)
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors"
              >
                <IconX className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button 
            onClick={handleSearch}
            disabled={!query.trim() || loading}
            className="h-11 px-6 bg-primary-500 hover:bg-primary-600 text-white transition-all duration-200 hover:scale-105"
          >
            {loading ? (
              <>
                <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <IconSearch className="h-4 w-4 mr-2" />
                Search
              </>
            )}
          </Button>
        </div>
      </div>

      {hasSearched && searchQuery.trim() && (
        <div className="bg-glassmorphism dark:bg-glassmorphism-dark backdrop-blur-xl border border-glass-border dark:border-glass-border-dark rounded-2xl p-4 shadow-xl">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="grid w-full grid-cols-4 h-11 bg-white/20 dark:bg-white/5">
              <TabsTrigger value="all" className="flex items-center gap-2 data-[state=active]:bg-primary-500 data-[state=active]:text-white data-[state=active]:shadow-sm text-black/70 dark:text-white/70">
                All
              </TabsTrigger>
              <TabsTrigger value="posts" className="flex items-center gap-2 data-[state=active]:bg-primary-500 data-[state=active]:text-white data-[state=active]:shadow-sm text-black/70 dark:text-white/70">
                <IconMessage className="h-4 w-4" />
                Posts
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2 data-[state=active]:bg-primary-500 data-[state=active]:text-white data-[state=active]:shadow-sm text-black/70 dark:text-white/70">
                <IconUsersGroup className="h-4 w-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="communities" className="flex items-center gap-2 data-[state=active]:bg-primary-500 data-[state=active]:text-white data-[state=active]:shadow-sm text-black/70 dark:text-white/70">
                <IconBuilding className="h-4 w-4" />
                Communities
              </TabsTrigger>
            </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {error ? (
              <div className="p-8 bg-glassmorphism dark:bg-glassmorphism-dark backdrop-blur-xl border border-glass-border dark:border-glass-border-dark rounded-2xl shadow-xl text-center">
                <p className="text-red-500 mb-4">{error}</p>
                <Button 
                  onClick={() => performSearch(searchQuery, activeTab)} 
                  variant="outline"
                  className="border-primary-500 text-primary-500 hover:bg-primary-500 hover:text-white"
                >
                  Try Again
                </Button>
              </div>
            ) : loading && results.length === 0 ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse p-4 bg-glassmorphism dark:bg-glassmorphism-dark backdrop-blur-xl border border-glass-border dark:border-glass-border-dark rounded-2xl shadow-xl">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-black/10 dark:bg-white/10 rounded-full" />
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center space-x-2">
                          <div className="h-4 bg-black/10 dark:bg-white/10 rounded w-32" />
                          <div className="h-5 bg-black/10 dark:bg-white/10 rounded-full w-16" />
                        </div>
                        <div className="space-y-2">
                          <div className="h-3 bg-black/10 dark:bg-white/10 rounded w-full" />
                          <div className="h-3 bg-black/10 dark:bg-white/10 rounded w-3/4" />
                        </div>
                        <div className="flex space-x-4">
                          <div className="h-3 bg-black/10 dark:bg-white/10 rounded w-16" />
                          <div className="h-3 bg-black/10 dark:bg-white/10 rounded w-20" />
                        </div>
                      </div>
                    </div>
                  </div>
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
                  <div ref={ref as any} className="py-6">
                    {loadingMore && (
                      <div className="p-6 bg-glassmorphism dark:bg-glassmorphism-dark backdrop-blur-xl border border-glass-border dark:border-glass-border-dark rounded-2xl shadow-xl">
                        <div className="flex justify-center items-center gap-3 text-primary-500">
                          <IconLoader2 className="h-5 w-5 animate-spin" />
                          <span className="font-medium">Loading more results...</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Empty state */}
                {results.length === 0 && !loading && (
                  <div className="p-8 bg-glassmorphism dark:bg-glassmorphism-dark backdrop-blur-xl border border-glass-border dark:border-glass-border-dark rounded-2xl shadow-xl text-center">
                    <div className="p-4 bg-primary-500/10 rounded-full w-fit mx-auto mb-6">
                      <IconSearch className="h-8 w-8 text-primary-500" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3 text-black dark:text-white">No results found</h3>
                    <p className="text-black/60 dark:text-white/60 text-lg mb-4">
                      We couldn't find anything matching "{searchQuery}"
                    </p>
                    <div className="text-sm text-black/60 dark:text-white/60 space-y-1">
                      <p>• Try using different keywords</p>
                      <p>• Check your spelling</p>
                      <p>• Browse different categories using the tabs above</p>
                    </div>
                  </div>
                )}
              </>
            )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}
