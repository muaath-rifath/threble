'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { IconUserCheck, IconX, IconClock } from '@tabler/icons-react'
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

interface ConnectionRequest {
  id: string
  user: User
  createdAt: string
  type: 'sent' | 'received'
}

interface ConnectionRequestsProps {
  type?: 'sent' | 'received' | 'all'
}

export function ConnectionRequests({ type = 'all' }: ConnectionRequestsProps) {
  const [requests, setRequests] = useState<ConnectionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchRequests = async () => {
    try {
      // Fetch both sent and received requests when type is 'all'
      if (type === 'all') {
        const [receivedResponse, sentResponse] = await Promise.all([
          fetch('/api/user/connections/requests?type=received'),
          fetch('/api/user/connections/requests?type=sent')
        ])

        const [receivedData, sentData] = await Promise.all([
          receivedResponse.json(),
          sentResponse.json()
        ])

        if (receivedResponse.ok && sentResponse.ok) {
          const allRequests = [
            ...(receivedData.requests || []),
            ...(sentData.requests || [])
          ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          setRequests(allRequests)
        } else {
          throw new Error('Failed to fetch requests')
        }
      } else {
        const response = await fetch(`/api/user/connections/requests?type=${type}`)
        const data = await response.json()

        if (response.ok) {
          setRequests(data.requests || [])
        } else {
          throw new Error(data.error || 'Failed to fetch requests')
        }
      }
    } catch (error) {
      console.error('Failed to fetch connection requests:', error)
      toast({
        title: "Error",
        description: "Failed to load connection requests",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [type])

  const handleWithdraw = async (requestId: string, targetUserId: string) => {
    setActionLoading(requestId)
    try {
      const response = await fetch('/api/user/connections', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong')
      }

      // Remove the request from the list
      setRequests(prev => prev.filter(req => req.id !== requestId))

      toast({
        title: "Request withdrawn",
        description: "Connection request has been withdrawn",
      })
    } catch (error) {
      console.error('Withdraw request failed:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to withdraw request',
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleConnectionAction = async (requestId: string, action: 'accept' | 'reject', targetUserId: string) => {
    setActionLoading(requestId)
    try {
      const response = await fetch('/api/user/connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId,
          action
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong')
      }

      // Remove the request from the list
      setRequests(prev => prev.filter(req => req.id !== requestId))

      toast({
        title: action === 'accept' ? "Connection accepted" : "Connection rejected",
        description: data.message,
      })
    } catch (error) {
      console.error('Connection action failed:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to perform action',
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {type === 'all' ? 'Connection Requests' : 
             type === 'received' ? 'Connection Requests' : 'Sent Requests'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
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

  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {type === 'all' ? 'Connection Requests' : 
             type === 'received' ? 'Connection Requests' : 'Sent Requests'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <IconClock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>
              {type === 'all' 
                ? "No connection requests at the moment" 
                : type === 'received' 
                  ? "No connection requests at the moment" 
                  : "No pending requests sent"
              }
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {type === 'all' ? 'Connection Requests' : 
           type === 'received' ? 'Connection Requests' : 'Sent Requests'} ({requests.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {requests.map((request) => (
            <div 
              key={request.id} 
              id={`request-${request.id}`}
              className="flex items-center justify-between p-4 border rounded-lg scroll-mt-20"
            >
              <div className="flex items-center space-x-3">
                <Link href={`/${request.user.username}`}>
                  <Avatar className="w-12 h-12 cursor-pointer hover:opacity-80">
                    <AvatarImage src={request.user.image || ''} />
                    <AvatarFallback>
                      {request.user.name?.charAt(0) || request.user.username?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div>
                  <Link 
                    href={`/${request.user.username}`}
                    className="font-medium hover:underline"
                  >
                    {request.user.name || request.user.username}
                  </Link>
                  <p className="text-sm text-gray-500">
                    @{request.user.username}
                  </p>
                  {request.user.profile?.bio && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {request.user.profile.bio}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {request.type === 'received' && (
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={() => handleConnectionAction(request.id, 'accept', request.user.id)}
                    disabled={actionLoading === request.id}
                  >
                    <IconUserCheck className="w-4 h-4 mr-1" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleConnectionAction(request.id, 'reject', request.user.id)}
                    disabled={actionLoading === request.id}
                  >
                    <IconX className="w-4 h-4 mr-1" />
                    Decline
                  </Button>
                </div>
              )}

              {request.type === 'sent' && (
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleWithdraw(request.id, request.user.id)}
                    disabled={actionLoading === request.id}
                  >
                    <IconX className="w-4 h-4 mr-1" />
                    Withdraw
                  </Button>
                  <div className="flex items-center text-sm text-gray-500">
                    <IconClock className="w-4 h-4 mr-1" />
                    Pending
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
