'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { UserCheck, UserPlus, Clock, X } from 'lucide-react'

interface ConnectionButtonProps {
  userId: string
  initialStatus: string | null
  username?: string
  className?: string
}

export function ConnectionButton({ 
  userId, 
  initialStatus, 
  username,
  className = "" 
}: ConnectionButtonProps) {
  const [status, setStatus] = useState(initialStatus || 'not_connected')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleConnectionAction = async (action: string) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/user/connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: userId,
          action
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong')
      }

      // Update status based on action
      switch (action) {
        case 'send_request':
          setStatus('request_sent')
          toast({
            title: "Connection request sent",
            description: `Your connection request has been sent to ${username || 'the user'}.`,
          })
          break
        case 'accept':
          setStatus('connected')
          toast({
            title: "Connection accepted",
            description: `You are now connected with ${username || 'the user'}.`,
          })
          break
        case 'reject':
          setStatus('rejected')
          toast({
            title: "Connection request rejected",
            description: "The connection request has been rejected.",
          })
          break
        case 'remove':
          setStatus('not_connected')
          toast({
            title: "Connection removed",
            description: `You are no longer connected with ${username || 'the user'}.`,
          })
          break
      }
    } catch (error) {
      console.error('Connection action failed:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to perform action',
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const renderButton = () => {
    switch (status) {
      case 'not_connected':
        return (
          <Button 
            onClick={() => handleConnectionAction('send_request')}
            disabled={isLoading}
            className={className}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Connect
          </Button>
        )

      case 'request_sent':
        return (
          <Button 
            variant="outline" 
            disabled={isLoading}
            className={className}
          >
            <Clock className="w-4 h-4 mr-2" />
            Request Sent
          </Button>
        )

      case 'request_received':
        return (
          <div className="flex gap-2">
            <Button 
              onClick={() => handleConnectionAction('accept')}
              disabled={isLoading}
              className={className}
            >
              <UserCheck className="w-4 h-4 mr-2" />
              Accept
            </Button>
            <Button 
              variant="outline"
              onClick={() => handleConnectionAction('reject')}
              disabled={isLoading}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )

      case 'connected':
        return (
          <Button 
            variant="outline"
            onClick={() => handleConnectionAction('remove')}
            disabled={isLoading}
            className={className}
          >
            <UserCheck className="w-4 h-4 mr-2" />
            Connected
          </Button>
        )

      case 'rejected':
        return (
          <Button 
            variant="ghost" 
            disabled={true}
            className={className}
          >
            Request Declined
          </Button>
        )

      case 'blocked':
        return (
          <Button 
            variant="ghost" 
            disabled={true}
            className={className}
          >
            Unavailable
          </Button>
        )

      default:
        return (
          <Button 
            onClick={() => handleConnectionAction('send_request')}
            disabled={isLoading}
            className={className}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Connect
          </Button>
        )
    }
  }

  return renderButton()
}
