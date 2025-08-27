'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Search, UserX, Users } from 'lucide-react'
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
  const [searchQuery, setSearchQuery] = useState('')
  const [removeLoading, setRemoveLoading] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchConnections = async () => {
    try {
      const response = await fetch('/api/user/connections?status=ACCEPTED&limit=100')
      const data = await response.json()

      if (response.ok) {
        setConnections(data.connections || [])
        setFilteredConnections(data.connections || [])
      } else {
        throw new Error(data.error || 'Failed to fetch connections')
      }
    } catch (error) {
      console.error('Failed to fetch connections:', error)
      toast({
        title: "Error",
        description: "Failed to load connections",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConnections()
  }, [])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConnections(connections)
    } else {
      const filtered = connections.filter(connection => 
        connection.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        connection.user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        connection.user.profile?.bio?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredConnections(filtered)
    }
  }, [searchQuery, connections])

  const handleRemoveConnection = async (connectionId: string, userId: string, userName: string) => {
    setRemoveLoading(connectionId)
    try {
      const response = await fetch('/api/user/connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: userId,
          action: 'remove'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong')
      }

      // Remove the connection from the list
      setConnections(prev => prev.filter(conn => conn.id !== connectionId))

      toast({
        title: "Connection removed",
        description: `You are no longer connected with ${userName}.`,
      })
    } catch (error) {
      console.error('Remove connection failed:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to remove connection',
        variant: "destructive",
      })
    } finally {
      setRemoveLoading(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Connections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center space-x-4 animate-pulse">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (connections.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Connections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No connections yet</p>
            <p className="text-sm">Start connecting with other users to build your network!</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Connections ({connections.length})</CardTitle>
        {showSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search connections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filteredConnections.map((connection) => (
            <div key={connection.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Link href={`/${connection.user.username}`}>
                  <Avatar className="w-12 h-12 cursor-pointer hover:opacity-80">
                    <AvatarImage src={connection.user.image || ''} />
                    <AvatarFallback>
                      {connection.user.name?.charAt(0) || connection.user.username?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div>
                  <Link 
                    href={`/${connection.user.username}`}
                    className="font-medium hover:underline"
                  >
                    {connection.user.name || connection.user.username}
                  </Link>
                  <p className="text-sm text-gray-500">
                    @{connection.user.username}
                  </p>
                  {connection.user.profile?.bio && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {connection.user.profile.bio}
                    </p>
                  )}
                  {connection.user.profile?.location && (
                    <p className="text-xs text-gray-400 mt-1">
                      📍 {connection.user.profile.location}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Connected {new Date(connection.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRemoveConnection(
                  connection.id, 
                  connection.user.id, 
                  connection.user.name || connection.user.username || 'this user'
                )}
                disabled={removeLoading === connection.id}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <UserX className="w-4 h-4 mr-1" />
                Remove
              </Button>
            </div>
          ))}

          {filteredConnections.length === 0 && searchQuery && (
            <div className="text-center py-8 text-gray-500">
              <Search className="w-8 h-8 mx-auto mb-4 opacity-50" />
              <p>No connections found matching "{searchQuery}"</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
