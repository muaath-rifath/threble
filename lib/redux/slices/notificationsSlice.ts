import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'

// Types
interface Notification {
  id: string
  type: string
  message: string
  isRead: boolean
  createdAt: string
  fromUserId?: string
  fromUser?: {
    id: string
    name: string | null
    image: string | null
    username: string | null
  }
  postId?: string
  post?: {
    id: string
    content: string
  }
}

interface NotificationsState {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  error: string | null
  hasMore: boolean
  page: number
}

// Async thunks
export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async ({ page = 1, limit = 20 }: { page?: number; limit?: number } = {}) => {
    const response = await fetch(`/api/notifications?page=${page}&limit=${limit}`)
    if (!response.ok) throw new Error('Failed to fetch notifications')
    const data = await response.json()
    return { ...data, page }
  }
)

export const markNotificationRead = createAsyncThunk(
  'notifications/markNotificationRead',
  async (notificationId: string) => {
    const response = await fetch(`/api/notifications/${notificationId}/read`, {
      method: 'PATCH'
    })
    if (!response.ok) throw new Error('Failed to mark notification as read')
    return notificationId
  }
)

export const markAllNotificationsRead = createAsyncThunk(
  'notifications/markAllNotificationsRead',
  async () => {
    const response = await fetch('/api/notifications/mark-all-read', {
      method: 'PATCH'
    })
    if (!response.ok) throw new Error('Failed to mark all notifications as read')
    return true
  }
)

export const deleteNotification = createAsyncThunk(
  'notifications/deleteNotification',
  async (notificationId: string) => {
    const response = await fetch(`/api/notifications/${notificationId}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Failed to delete notification')
    return notificationId
  }
)

export const fetchUnreadCount = createAsyncThunk(
  'notifications/fetchUnreadCount',
  async () => {
    const response = await fetch('/api/notifications/unread-count')
    if (!response.ok) throw new Error('Failed to fetch unread count')
    const data = await response.json()
    return data.count
  }
)

// Initial state
const initialState: NotificationsState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  hasMore: true,
  page: 1
}

// Slice
const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    // Real-time updates
    addNotification: (state, action: PayloadAction<Notification>) => {
      const notification = action.payload
      // Add to beginning of list
      state.notifications.unshift(notification)
      // Increment unread count if not read
      if (!notification.isRead) {
        state.unreadCount++
      }
    },
    updateNotification: (state, action: PayloadAction<Notification>) => {
      const updatedNotification = action.payload
      const index = state.notifications.findIndex(n => n.id === updatedNotification.id)
      if (index !== -1) {
        const wasUnread = !state.notifications[index].isRead
        const isNowRead = updatedNotification.isRead
        
        state.notifications[index] = updatedNotification
        
        // Update unread count
        if (wasUnread && isNowRead) {
          state.unreadCount = Math.max(0, state.unreadCount - 1)
        } else if (!wasUnread && !isNowRead) {
          state.unreadCount++
        }
      }
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      const notificationId = action.payload
      const index = state.notifications.findIndex(n => n.id === notificationId)
      if (index !== -1) {
        const notification = state.notifications[index]
        // Decrease unread count if notification was unread
        if (!notification.isRead) {
          state.unreadCount = Math.max(0, state.unreadCount - 1)
        }
        state.notifications.splice(index, 1)
      }
    },
    markAsRead: (state, action: PayloadAction<string>) => {
      const notificationId = action.payload
      const notification = state.notifications.find(n => n.id === notificationId)
      if (notification && !notification.isRead) {
        notification.isRead = true
        state.unreadCount = Math.max(0, state.unreadCount - 1)
      }
    },
    markAllAsRead: (state) => {
      state.notifications.forEach(notification => {
        notification.isRead = true
      })
      state.unreadCount = 0
    },
    setUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload
    },
    resetNotifications: (state) => {
      state.notifications = []
      state.unreadCount = 0
      state.hasMore = true
      state.page = 1
      state.error = null
    }
  },
  extraReducers: (builder) => {
    // Fetch notifications
    builder.addCase(fetchNotifications.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(fetchNotifications.fulfilled, (state, action) => {
      const { notifications, unreadCount, hasMore, page } = action.payload
      state.loading = false
      
      if (page === 1) {
        // First page - replace all notifications
        state.notifications = notifications
      } else {
        // Additional pages - append to existing
        state.notifications.push(...notifications)
      }
      
      state.unreadCount = unreadCount
      state.hasMore = hasMore
      state.page = page
    })
    builder.addCase(fetchNotifications.rejected, (state, action) => {
      state.loading = false
      state.error = action.error.message || 'Failed to fetch notifications'
    })

    // Mark notification read
    builder.addCase(markNotificationRead.fulfilled, (state, action) => {
      const notificationId = action.payload
      const notification = state.notifications.find(n => n.id === notificationId)
      if (notification && !notification.isRead) {
        notification.isRead = true
        state.unreadCount = Math.max(0, state.unreadCount - 1)
      }
    })
    builder.addCase(markNotificationRead.rejected, (state, action) => {
      state.error = action.error.message || 'Failed to mark notification as read'
    })

    // Mark all notifications read
    builder.addCase(markAllNotificationsRead.fulfilled, (state) => {
      state.notifications.forEach(notification => {
        notification.isRead = true
      })
      state.unreadCount = 0
    })
    builder.addCase(markAllNotificationsRead.rejected, (state, action) => {
      state.error = action.error.message || 'Failed to mark all notifications as read'
    })

    // Delete notification
    builder.addCase(deleteNotification.fulfilled, (state, action) => {
      const notificationId = action.payload
      const index = state.notifications.findIndex(n => n.id === notificationId)
      if (index !== -1) {
        const notification = state.notifications[index]
        if (!notification.isRead) {
          state.unreadCount = Math.max(0, state.unreadCount - 1)
        }
        state.notifications.splice(index, 1)
      }
    })
    builder.addCase(deleteNotification.rejected, (state, action) => {
      state.error = action.error.message || 'Failed to delete notification'
    })

    // Fetch unread count
    builder.addCase(fetchUnreadCount.fulfilled, (state, action) => {
      state.unreadCount = action.payload
    })
    builder.addCase(fetchUnreadCount.rejected, (state, action) => {
      state.error = action.error.message || 'Failed to fetch unread count'
    })
  }
})

export const {
  addNotification,
  updateNotification,
  removeNotification,
  markAsRead,
  markAllAsRead,
  setUnreadCount,
  resetNotifications
} = notificationsSlice.actions
export default notificationsSlice.reducer
