'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bell, Check, X, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useSession } from 'next-auth/react'
import { useInView } from '@intersection-observer/next'

interface NotificationActor {
  id: string
  name: string | null
  username: string | null
  image: string | null
}

interface NotificationCommunity {
  id: string
  name: string
  slug: string
}

interface Notification {
  id: string
  type: string
  message: string | null
  read: boolean
  createdAt: string
  actor: NotificationActor | null
  community: NotificationCommunity | null
  postId: string | null
}

export default function NotificationsPage() {
  const [allNotifications, setAllNotifications] = useState<Notification[]>([])
  const [unreadNotifications, setUnreadNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [activeTab, setActiveTab] = useState('all')
  const [allCursor, setAllCursor] = useState<string | null>(null)
  const [unreadCursor, setUnreadCursor] = useState<string | null>(null)
  const [hasMoreAll, setHasMoreAll] = useState(true)
  const [hasMoreUnread, setHasMoreUnread] = useState(true)
  const router = useRouter()
  const { toast } = useToast()
  const { data: session, status } = useSession()

  // Intersection observer for infinite scroll
  const { ref, inView } = useInView({
    threshold: 0
  })

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') {
      router.push('/signin')
      return
    }
  }, [status, router])

  const fetchNotifications = async (unreadOnly = false, isLoadMore = false) => {
    try {
      if (!isLoadMore) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      
      const cursor = unreadOnly ? unreadCursor : allCursor
      const params = new URLSearchParams({ 
        limit: '20',
        ...(unreadOnly && { unread: 'true' }),
        ...(cursor && { cursor })
      })
      
      const response = await fetch(`/api/notifications?${params}`)
      const data = await response.json()

      if (response.ok) {
        if (unreadOnly) {
          if (isLoadMore) {
            setUnreadNotifications(prev => [...prev, ...(data.notifications || [])])
          } else {
            setUnreadNotifications(data.notifications || [])
          }
          setUnreadCursor(data.nextCursor)
          setHasMoreUnread(data.hasMore)
        } else {
          if (isLoadMore) {
            setAllNotifications(prev => [...prev, ...(data.notifications || [])])
          } else {
            setAllNotifications(data.notifications || [])
          }
          setAllCursor(data.nextCursor)
          setHasMoreAll(data.hasMore)
        }
        setUnreadCount(data.unreadCount || 0)
      } else {
        throw new Error(data.error || 'Failed to fetch notifications')
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const refreshNotifications = async () => {
    setRefreshing(true)
    // Reset cursors and states
    setAllCursor(null)
    setUnreadCursor(null)
    setHasMoreAll(true)
    setHasMoreUnread(true)
    
    await Promise.all([
      fetchNotifications(false, false),
      fetchNotifications(true, false)
    ])
    setRefreshing(false)
  }

  // Load more when scrolling to bottom
  useEffect(() => {
    if (inView && !loading && !loadingMore) {
      const currentHasMore = activeTab === 'unread' ? hasMoreUnread : hasMoreAll
      if (currentHasMore) {
        fetchNotifications(activeTab === 'unread', true)
      }
    }
  }, [inView, loading, loadingMore, activeTab, hasMoreAll, hasMoreUnread])

  useEffect(() => {
    if (session) {
      fetchNotifications(false)
      fetchNotifications(true)
    }
  }, [session])

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId, read: true })
      })

      if (response.ok) {
        // Update both lists
        setAllNotifications(prev =>
          prev.map(notif =>
            notif.id === notificationId ? { ...notif, read: true } : notif
          )
        )
        setUnreadNotifications(prev =>
          prev.filter(notif => notif.id !== notificationId)
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true })
      })

      if (response.ok) {
        setAllNotifications(prev => prev.map(notif => ({ ...notif, read: true })))
        setUnreadNotifications([])
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
    if (!notification.read) {
      markAsRead(notification.id)
    }
    
    // Navigate based on notification type
    switch (notification.type) {
      case 'CONNECTION_REQUEST':
        router.push('/connections?tab=requests')
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
        if (notification.community?.slug) {
          router.push(`/communities/${notification.community.slug}`)
        }
        break
      default:
        break
    }
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

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  const renderNotificationsList = (notifications: Notification[]) => (
    <div className="space-y-2">
      {notifications.map((notification) => (
        <Card
          key={notification.id}
          className={`cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
            !notification.read ? 'border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''
          }`}
          onClick={() => handleNotificationClick(notification)}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                {notification.actor ? (
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={notification.actor.image || ''} />
                    <AvatarFallback>
                      {notification.actor.name?.charAt(0) || 
                       notification.actor.username?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-gray-100 mb-1">
                  {notification.message}
                </p>
                <p className="text-xs text-gray-500">
                  {formatTimeAgo(notification.createdAt)}
                </p>
              </div>
              {!notification.read && (
                <div className="flex-shrink-0">
                  <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
      
      {/* Infinite scroll trigger */}
      {((activeTab === 'all' && hasMoreAll) || (activeTab === 'unread' && hasMoreUnread)) && (
        <div ref={ref as any} className="py-4">
          {loadingMore && (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
        </div>
      )}
    </div>
  )

  if (status === 'loading' || !session) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Bell className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshNotifications}
            disabled={refreshing}
            className="p-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
            >
              <Check className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1">
            All ({allNotifications.length})
          </TabsTrigger>
          <TabsTrigger value="unread" className="flex-1">
            Unread ({unreadCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : allNotifications.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">No notifications yet</p>
              </CardContent>
            </Card>
          ) : (
            renderNotificationsList(allNotifications)
          )}
        </TabsContent>

        <TabsContent value="unread" className="mt-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : unreadNotifications.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Check className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p className="text-gray-500">You're all caught up!</p>
                <p className="text-sm text-gray-400 mt-1">No unread notifications</p>
              </CardContent>
            </Card>
          ) : (
            renderNotificationsList(unreadNotifications)
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
