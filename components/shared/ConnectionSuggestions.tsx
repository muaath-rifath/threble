'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ConnectionButton } from './ConnectionButton'
import { useToast } from '@/hooks/use-toast'
import { IconUsers, IconBuilding } from '@tabler/icons-react'
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

interface Community {
  id: string
  name: string
}

interface ConnectionSuggestion {
  id: string
  name: string | null
  username: string | null
  image: string | null
  profile: {
    bio: string | null
    location: string | null
  } | null
  mutualConnectionsCount: number
  mutualCommunities: Community[]
  suggestedBecause: 'mutual_connections' | 'mutual_communities' | 'new_member'
}

interface ConnectionSuggestionsProps {
  limit?: number
  showTitle?: boolean
}

export function ConnectionSuggestions({ limit = 10, showTitle = true }: ConnectionSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<ConnectionSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [connectedUsers, setConnectedUsers] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  const fetchSuggestions = async () => {
    try {
      const response = await fetch(`/api/user/connections/suggestions?limit=${limit}`)
      const data = await response.json()

      if (response.ok) {
        setSuggestions(data.suggestions || [])
      } else {
        throw new Error(data.error || 'Failed to fetch suggestions')
      }
    } catch (error) {
      console.error('Failed to fetch connection suggestions:', error)
      toast({
        title: "Error",
        description: "Failed to load connection suggestions",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSuggestions()
  }, [limit])

  const handleConnectionSuccess = (userId: string) => {
    setConnectedUsers(prev => new Set(prev).add(userId))
    // Optionally remove from suggestions
    setSuggestions(prev => prev.filter(suggestion => suggestion.id !== userId))
  }

  const getSuggestionReason = (suggestion: ConnectionSuggestion) => {
    switch (suggestion.suggestedBecause) {
      case 'mutual_connections':
        return `${suggestion.mutualConnectionsCount} mutual connection${suggestion.mutualConnectionsCount !== 1 ? 's' : ''}`
      case 'mutual_communities':
        return `${suggestion.mutualCommunities.length} mutual communit${suggestion.mutualCommunities.length !== 1 ? 'ies' : 'y'}`
      case 'new_member':
        return 'New member'
      default:
        return 'Suggested for you'
    }
  }

  if (loading) {
    return (
      <Card>
        {showTitle && (
          <CardHeader>
            <CardTitle>People You May Know</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4 animate-pulse">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
                <div className="w-20 h-8 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (suggestions.length === 0) {
    return (
      <Card>
        {showTitle && (
          <CardHeader>
            <CardTitle>People You May Know</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <IconUsers className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No suggestions available at the moment</p>
            <p className="text-sm">Check back later for new connection suggestions!</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      {showTitle && (
        <CardHeader>
          <CardTitle>People You May Know</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <div className="space-y-4">
          {suggestions.map((suggestion) => (
            <div key={suggestion.id} className="flex items-start justify-between p-4 border rounded-lg">
              <div className="flex items-start space-x-3">
                <Link href={`/${suggestion.username}`}>
                  <Avatar className="w-12 h-12 cursor-pointer hover:opacity-80">
                    <AvatarImage src={suggestion.image || ''} />
                    <AvatarFallback>
                      {suggestion.name?.charAt(0) || suggestion.username?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1">
                  <Link 
                    href={`/${suggestion.username}`}
                    className="font-medium hover:underline"
                  >
                    {suggestion.name || suggestion.username}
                  </Link>
                  <p className="text-sm text-gray-500">
                    @{suggestion.username}
                  </p>
                  
                  {suggestion.profile?.bio && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {suggestion.profile.bio}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {suggestion.mutualConnectionsCount > 0 ? (
                        <>
                          <IconUsers className="w-3 h-3 mr-1" />
                          {getSuggestionReason(suggestion)}
                        </>
                      ) : suggestion.mutualCommunities.length > 0 ? (
                        <>
                          <IconBuilding className="w-3 h-3 mr-1" />
                          {getSuggestionReason(suggestion)}
                        </>
                      ) : (
                        getSuggestionReason(suggestion)
                      )}
                    </Badge>
                  </div>

                  {suggestion.mutualCommunities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {suggestion.mutualCommunities.slice(0, 2).map((community) => (
                        <Badge key={community.id} variant="outline" className="text-xs">
                          {community.name}
                        </Badge>
                      ))}
                      {suggestion.mutualCommunities.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{suggestion.mutualCommunities.length - 2} more
                        </Badge>
                      )}
                    </div>
                  )}

                  {suggestion.profile?.location && (
                    <p className="text-xs text-gray-400 mt-1">
                      📍 {suggestion.profile.location}
                    </p>
                  )}
                </div>
              </div>

              <div className="ml-4">
                <ConnectionButton
                  userId={suggestion.id}
                  initialStatus="not_connected"
                  username={suggestion.username || undefined}
                  className="text-sm px-3"
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
