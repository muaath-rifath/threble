'use client'

import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks'
import { fetchPosts } from '@/lib/redux/slices/postsSlice'
import { addToast } from '@/lib/redux/slices/uiSlice'
import { fetchNotifications } from '@/lib/redux/slices/notificationsSlice'

/**
 * Example component demonstrating Redux state management
 * This shows how to:
 * 1. Dispatch actions to fetch data
 * 2. Select state from different slices
 * 3. Handle loading states
 * 4. Display real-time updates
 */
export default function ReduxExample() {
  const dispatch = useAppDispatch()
  
  // Select state from different slices
  const { posts, loading: postsLoading, error: postsError } = useAppSelector(state => state.posts)
  const { unreadCount } = useAppSelector(state => state.notifications)
  const { globalLoading, toasts } = useAppSelector(state => state.ui)
  
  useEffect(() => {
    // Fetch initial data
    dispatch(fetchPosts({ limit: 10 }))
    dispatch(fetchNotifications({}))
  }, [dispatch])
  
  const handleShowToast = () => {
    dispatch(addToast({
      type: 'success',
      message: 'Redux is working perfectly!',
      duration: 3000
    }))
  }
  
  return (
    <div className="p-4 border rounded-lg bg-card">
      <h2 className="text-xl font-bold mb-4">Redux State Management Demo</h2>
      
      {/* Loading States */}
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Loading States:</h3>
        <p>Global Loading: {globalLoading ? '✅ Active' : '❌ Inactive'}</p>
        <p>Posts Loading: {postsLoading ? '✅ Loading' : '❌ Not Loading'}</p>
      </div>
      
      {/* Posts State */}
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Posts ({posts.length}):</h3>
        {postsError && <p className="text-red-500">Error: {postsError}</p>}
        <div className="space-y-2">
          {posts.slice(0, 3).map(post => (
            <div key={post.id} className="p-2 bg-muted rounded">
              <p className="text-sm">{post.content.slice(0, 100)}...</p>
              <p className="text-xs text-muted-foreground">
                By {post.author.name} • {post.reactions?.length || 0} reactions
              </p>
            </div>
          ))}
        </div>
      </div>
      
      {/* Notifications */}
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Notifications:</h3>
        <p>Unread Count: <span className="font-bold text-blue-600">{unreadCount}</span></p>
      </div>
      
      {/* Toasts */}
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Active Toasts ({toasts.length}):</h3>
        {toasts.map(toast => (
          <div key={toast.id} className={`p-2 rounded text-sm mb-1 ${
            toast.type === 'success' ? 'bg-green-100 text-green-800' : 
            toast.type === 'error' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {toast.message}
          </div>
        ))}
        
        <button 
          onClick={handleShowToast}
          className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
        >
          Show Toast
        </button>
      </div>
      
      <div className="text-xs text-muted-foreground mt-4">
        <p>✨ This component demonstrates real-time Redux state management</p>
        <p>🔄 All interactions update state without page refreshes</p>
        <p>📊 State is shared across all components in the app</p>
      </div>
    </div>
  )
}
