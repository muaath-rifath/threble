'use client'

import { useState, useEffect, useCallback } from 'react'
import { useInView } from '@intersection-observer/next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Search, UserX, Users, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface User {
  id: string
  name: string | null
  username: string | null
  image: string | null
  profile: {
    bio: string | null
    location: string | null
  } | null
}

interface Connection {
  id: string
  user: User
  status: string
  createdAt: string
  updatedAt: string
  isRequester: boolean
}

interface ConnectionsListProps {
  showSearch?: boolean
}

export function ConnectionsList({ showSearch = true }: ConnectionsListProps) {
  const [connections, setConnections] = useState<Connection[]>([])
  const [filteredConnections, setFilteredConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [cursor, setCursor] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [removeLoading, setRemoveLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Intersection observer for infinite scroll
  const { ref, inView } = useInView({
    threshold: 0
  })

  const fetchConnections = useCallback(async (isLoadMore = false) => {
    try {
      if (!isLoadMore) {
        setLoading(true)
        setError(null)
      } else {
        setLoadingMore(true)
      }

      const params = new URLSearchParams({
        status: 'ACCEPTED',
        limit: '20',
        ...(isLoadMore && cursor && { cursor })
      })

      const response = await fetch(`/api/user/connections?${params}`)
      const data = await response.json()

      if (response.ok) {
        if (!isLoadMore) {
          setConnections(data.connections || [])
        } else {
          setConnections(prev => [...prev, ...data.connections])
        }
        setCursor(data.nextCursor)
        setHasMore(data.hasMore)
      } else {
        throw new Error(data.error || 'Failed to fetch connections')
      }
    } catch (error) {
      console.error('Failed to fetch connections:', error)
      setError('Failed to load connections')
      toast({
        title: "Error",
        description: "Failed to load connections",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [cursor, toast])

  // Initial load
  useEffect(() => {
    fetchConnections()
  }, [])

  // Infinite scroll effect
  useEffect(() => {
    if (inView && hasMore && !loading && !loadingMore) {
      fetchConnections(true)
    }
  }, [inView, hasMore, loading, loadingMore, fetchConnections])

  // Filter connections based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConnections(connections)
    } else {
      const filtered = connections.filter(connection =>
        connection.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        connection.user.username?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredConnections(filtered)
    }
  }, [connections, searchQuery])

  const removeConnection = async (connectionId: string) => {
    setRemoveLoading(connectionId)
    try {
      const response = await fetch('/api/user/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: connections.find(c => c.id === connectionId)?.user.id,
          action: 'remove'
        })
      })

      if (response.ok) {
        setConnections(prev => prev.filter(conn => conn.id !== connectionId))
        toast({
          title: "Success",
          description: "Connection removed successfully",
        })
      } else {
        throw new Error('Failed to remove connection')
      }
    } catch (error) {
      console.error('Failed to remove connection:', error)
      toast({
        title: "Error",
        description: "Failed to remove connection",
        variant: "destructive",
      })
    } finally {
      setRemoveLoading(null)
    }
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => fetchConnections()} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (loading && connections.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Connections
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4 animate-pulse">
              <div className="w-10 h-10 bg-muted rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-3 bg-muted rounded w-1/4" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Connections
          </CardTitle>
          
          {showSearch && (
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search connections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {filteredConnections.map((connection) => (
          <div key={connection.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
            <div className="flex items-center space-x-4">
              <Link href={`/${connection.user.username}`}>
                <Avatar className="cursor-pointer">
                  <AvatarImage src={connection.user.image || ''} />
                  <AvatarFallback>
                    {connection.user.name?.charAt(0).toUpperCase() || connection.user.username?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Link>
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Link 
                    href={`/${connection.user.username}`} 
                    className="font-semibold hover:underline truncate"
                  >
                    {connection.user.name}
                  </Link>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  @{connection.user.username}
                </p>
                {connection.user.profile?.bio && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                    {connection.user.profile.bio}
                  </p>
                )}
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => removeConnection(connection.id)}
              disabled={removeLoading === connection.id}
            >
              {removeLoading === connection.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserX className="h-4 w-4" />
              )}
            </Button>
          </div>
        ))}

        {/* Infinite scroll trigger */}
        {hasMore && (
          <div ref={ref as any} className="py-4">
            {loadingMore && (
              <div className="flex justify-center">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading more connections...
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {connections.length === 0 && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No connections found.</p>
          </div>
        )}

        {/* No search results */}
        {filteredConnections.length === 0 && searchQuery && connections.length > 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No connections match your search.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
