'use client'

import { useState, useEffect, useRef } from 'react'
import { IconBell, IconX, IconCheck, IconPoint } from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { useDropdown } from './DropdownContext'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NotificationActor {
  id: string
  name: string | null
  username: string | null
  image: string | null
}

interface NotificationCommunity {
  id: string
  name: string
  image: string | null
}

interface Notification {
  id: string
  type: string
  message: string | null
  read: boolean
  createdAt: string
  data?: {
    connectionId?: string
    [key: string]: any
  }
  actor: NotificationActor | null
  community: NotificationCommunity | null
  postId: string | null
}

interface NotificationDropdownProps {
  isMobile?: boolean
}

export function NotificationDropdown({ isMobile = false }: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { activeDropdown, setActiveDropdown } = useDropdown()
  const isOpen = activeDropdown === 'notifications'

  // Fetch notifications
  const fetchNotifications = async (cursor?: string) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ limit: '10' })
      if (cursor) params.set('cursor', cursor)

      const response = await fetch(`/api/notifications?${params}`)
      const data = await response.json()

      if (response.ok) {
        if (cursor) {
          setNotifications(prev => [...prev, ...data.notifications])
        } else {
          setNotifications(data.notifications || [])
        }
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch unread count only
  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/notifications?unread=true&limit=1')
      const data = await response.json()
      if (response.ok) {
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error)
    }
  }

  useEffect(() => {
    fetchUnreadCount()
  }, [])

  useEffect(() => {
    if (isOpen && notifications.length === 0) {
      fetchNotifications()
    }
  }, [isOpen])

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId, read: true })
      })

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === notificationId ? { ...notif, read: true } : notif
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true })
      })

      if (response.ok) {
        setNotifications(prev => prev.map(notif => ({ ...notif, read: true })))
        setUnreadCount(0)
        toast({
          title: "Success",
          description: "All notifications marked as read",
        })
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error)
      toast({
        title: "Error",
        description: "Failed to mark notifications as read",
        variant: "destructive",
      })
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id)
    
    // Navigate based on notification type
    switch (notification.type) {
      case 'CONNECTION_REQUEST':
        if (notification.data?.connectionId) {
          router.push(`/connections?tab=requests#request-${notification.data.connectionId}`)
        } else {
          router.push('/connections?tab=requests')
        }
        break
      case 'CONNECTION_ACCEPTED':
        router.push('/connections')
        break
      case 'POST_REACTION':
      case 'POST_REPLY':
        if (notification.postId) {
          router.push(`/thread/${notification.postId}`)
        }
        break
      case 'NEW_FOLLOWER':
        if (notification.actor?.username) {
          router.push(`/${notification.actor.username}`)
        }
        break
      case 'COMMUNITY_INVITATION':
      case 'COMMUNITY_NEW_MEMBER':
        if (notification.community?.name) {
          router.push(`/communities/${encodeURIComponent(notification.community.name)}`)
        }
        break
      default:
        break
    }
    
    setActiveDropdown(null)
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'CONNECTION_REQUEST':
      case 'CONNECTION_ACCEPTED':
        return '🤝'
      case 'POST_REACTION':
        return '❤️'
      case 'POST_REPLY':
        return '💬'
      case 'NEW_FOLLOWER':
        return '👤'
      case 'MENTION':
        return '📢'
      case 'COMMUNITY_INVITATION':
      case 'COMMUNITY_NEW_MEMBER':
        return '🏠'
      default:
        return '🔔'
    }
  }

  const handleBellClick = () => {
    if (isMobile) {
      router.push('/notifications')
    } else {
      setActiveDropdown(isOpen ? null : 'notifications')
    }
  }

  const handleOpenChange = (open: boolean) => {
    setActiveDropdown(open ? 'notifications' : null)
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 w-10 glass-button p-2"
          onClick={handleBellClick}
        >
          <IconBell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-80 glass-card shadow-xl max-h-96" align="end">
        {/* Header */}
        <DropdownMenuLabel className="font-normal p-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg text-black dark:text-white">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs glass-button"
                >
                  <IconCheck className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator className="bg-glass-border dark:bg-glass-border-dark" />
        
        {/* Notifications List */}
        <DropdownMenuGroup>
          <ScrollArea className="max-h-80">
            <div className="p-2">
              {loading && notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  No notifications yet
                </div>
              ) : (
                notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className={`glass-button cursor-pointer p-3 mb-1 border-l-2 ${
                      notification.read
                        ? 'border-transparent'
                        : 'border-primary-500 bg-primary-500/10'
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <div className="flex-shrink-0">
                        {notification.actor ? (
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={notification.actor.image || ''} />
                            <AvatarFallback>
                              {notification.actor.name?.charAt(0) || 
                               notification.actor.username?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="h-8 w-8 rounded-full glass-button flex items-center justify-center text-sm">
                            {getNotificationIcon(notification.type)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-gray-100">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="flex-shrink-0">
                          <IconPoint className="h-6 w-6 text-primary-500" />
                        </div>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </div>
          </ScrollArea>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-glass-border dark:bg-glass-border-dark" />
        
        {/* Footer */}
        <div className="p-3">
          <Link
            href="/notifications"
            className="block text-center text-sm text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
            onClick={() => setActiveDropdown(null)}
          >
            View all notifications
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
