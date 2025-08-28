import { createSlice, PayloadAction } from '@reduxjs/toolkit'

// Types
interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title?: string
  message: string
  duration?: number
}

interface Modal {
  id: string
  type: string
  props?: Record<string, any>
}

interface UIState {
  // Loading states
  globalLoading: boolean
  loadingStates: Record<string, boolean> // key -> loading state
  
  // Toasts
  toasts: Toast[]
  
  // Modals
  modals: Modal[]
  
  // Sidebar states
  leftSidebarOpen: boolean
  rightSidebarOpen: boolean
  
  // Mobile states
  isMobile: boolean
  mobileMenuOpen: boolean
  
  // Theme
  theme: 'light' | 'dark' | 'system'
  
  // Feed options
  feedType: 'home' | 'following' | 'community' | 'global'
  feedFilter: 'recent' | 'popular' | 'trending'
  
  // Post form
  postFormOpen: boolean
  postFormData: {
    content: string
    mediaFiles: File[]
    communityId?: string
    parentId?: string // for replies
  }
  
  // Search
  searchOpen: boolean
  searchQuery: string
  searchResults: {
    posts: any[]
    users: any[]
    communities: any[]
    loading: boolean
  }
  
  // Notifications
  notificationsPanelOpen: boolean
  
  // Profile menu
  profileMenuOpen: boolean
}

// Initial state
const initialState: UIState = {
  globalLoading: false,
  loadingStates: {},
  toasts: [],
  modals: [],
  leftSidebarOpen: true,
  rightSidebarOpen: true,
  isMobile: false,
  mobileMenuOpen: false,
  theme: 'system',
  feedType: 'home',
  feedFilter: 'recent',
  postFormOpen: false,
  postFormData: {
    content: '',
    mediaFiles: []
  },
  searchOpen: false,
  searchQuery: '',
  searchResults: {
    posts: [],
    users: [],
    communities: [],
    loading: false
  },
  notificationsPanelOpen: false,
  profileMenuOpen: false
}

// Slice
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Loading states
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.globalLoading = action.payload
    },
    setLoadingState: (state, action: PayloadAction<{ key: string; loading: boolean }>) => {
      const { key, loading } = action.payload
      if (loading) {
        state.loadingStates[key] = true
      } else {
        delete state.loadingStates[key]
      }
    },
    
    // Toast management
    addToast: (state, action: PayloadAction<Omit<Toast, 'id'>>) => {
      const toast = {
        ...action.payload,
        id: `toast-${Date.now()}-${Math.random()}`
      }
      state.toasts.push(toast)
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter(toast => toast.id !== action.payload)
    },
    clearToasts: (state) => {
      state.toasts = []
    },
    
    // Modal management
    openModal: (state, action: PayloadAction<{ type: string; props?: Record<string, any> }>) => {
      const modal = {
        id: `modal-${Date.now()}-${Math.random()}`,
        type: action.payload.type,
        props: action.payload.props
      }
      state.modals.push(modal)
    },
    closeModal: (state, action: PayloadAction<string>) => {
      state.modals = state.modals.filter(modal => modal.id !== action.payload)
    },
    closeTopModal: (state) => {
      state.modals.pop()
    },
    clearModals: (state) => {
      state.modals = []
    },
    
    // Sidebar states
    toggleLeftSidebar: (state) => {
      state.leftSidebarOpen = !state.leftSidebarOpen
    },
    setLeftSidebar: (state, action: PayloadAction<boolean>) => {
      state.leftSidebarOpen = action.payload
    },
    toggleRightSidebar: (state) => {
      state.rightSidebarOpen = !state.rightSidebarOpen
    },
    setRightSidebar: (state, action: PayloadAction<boolean>) => {
      state.rightSidebarOpen = action.payload
    },
    
    // Mobile states
    setIsMobile: (state, action: PayloadAction<boolean>) => {
      state.isMobile = action.payload
      // Auto-close sidebars on mobile
      if (action.payload) {
        state.leftSidebarOpen = false
        state.rightSidebarOpen = false
      }
    },
    toggleMobileMenu: (state) => {
      state.mobileMenuOpen = !state.mobileMenuOpen
    },
    setMobileMenu: (state, action: PayloadAction<boolean>) => {
      state.mobileMenuOpen = action.payload
    },
    
    // Theme
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.theme = action.payload
    },
    toggleTheme: (state) => {
      // Cycle through light -> dark -> system
      const themes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system']
      const currentIndex = themes.indexOf(state.theme)
      state.theme = themes[(currentIndex + 1) % themes.length]
    },
    
    // Feed options
    setFeedType: (state, action: PayloadAction<'home' | 'following' | 'community' | 'global'>) => {
      state.feedType = action.payload
    },
    setFeedFilter: (state, action: PayloadAction<'recent' | 'popular' | 'trending'>) => {
      state.feedFilter = action.payload
    },
    
    // Post form
    togglePostForm: (state) => {
      state.postFormOpen = !state.postFormOpen
      if (!state.postFormOpen) {
        // Reset form data when closing
        state.postFormData = {
          content: '',
          mediaFiles: []
        }
      }
    },
    setPostFormOpen: (state, action: PayloadAction<boolean>) => {
      state.postFormOpen = action.payload
      if (!action.payload) {
        // Reset form data when closing
        state.postFormData = {
          content: '',
          mediaFiles: []
        }
      }
    },
    updatePostFormContent: (state, action: PayloadAction<string>) => {
      state.postFormData.content = action.payload
    },
    setPostFormCommunity: (state, action: PayloadAction<string | undefined>) => {
      state.postFormData.communityId = action.payload
    },
    setPostFormParent: (state, action: PayloadAction<string | undefined>) => {
      state.postFormData.parentId = action.payload
    },
    addPostFormMedia: (state, action: PayloadAction<File>) => {
      state.postFormData.mediaFiles.push(action.payload)
    },
    removePostFormMedia: (state, action: PayloadAction<number>) => {
      state.postFormData.mediaFiles.splice(action.payload, 1)
    },
    resetPostForm: (state) => {
      state.postFormData = {
        content: '',
        mediaFiles: []
      }
      state.postFormOpen = false
    },
    
    // Search
    toggleSearch: (state) => {
      state.searchOpen = !state.searchOpen
      if (!state.searchOpen) {
        // Reset search when closing
        state.searchQuery = ''
        state.searchResults = {
          posts: [],
          users: [],
          communities: [],
          loading: false
        }
      }
    },
    setSearchOpen: (state, action: PayloadAction<boolean>) => {
      state.searchOpen = action.payload
      if (!action.payload) {
        // Reset search when closing
        state.searchQuery = ''
        state.searchResults = {
          posts: [],
          users: [],
          communities: [],
          loading: false
        }
      }
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload
    },
    setSearchLoading: (state, action: PayloadAction<boolean>) => {
      state.searchResults.loading = action.payload
    },
    setSearchResults: (state, action: PayloadAction<{
      posts: any[]
      users: any[]
      communities: any[]
    }>) => {
      state.searchResults = {
        ...action.payload,
        loading: false
      }
    },
    clearSearchResults: (state) => {
      state.searchResults = {
        posts: [],
        users: [],
        communities: [],
        loading: false
      }
    },
    
    // Notifications panel
    toggleNotificationsPanel: (state) => {
      state.notificationsPanelOpen = !state.notificationsPanelOpen
    },
    setNotificationsPanelOpen: (state, action: PayloadAction<boolean>) => {
      state.notificationsPanelOpen = action.payload
    },
    
    // Profile menu
    toggleProfileMenu: (state) => {
      state.profileMenuOpen = !state.profileMenuOpen
    },
    setProfileMenuOpen: (state, action: PayloadAction<boolean>) => {
      state.profileMenuOpen = action.payload
    },
    
    // Utility actions
    closeAllPanels: (state) => {
      state.mobileMenuOpen = false
      state.searchOpen = false
      state.notificationsPanelOpen = false
      state.profileMenuOpen = false
    },
    resetUI: (state) => {
      return {
        ...initialState,
        theme: state.theme, // Preserve theme setting
        isMobile: state.isMobile // Preserve mobile detection
      }
    }
  }
})

export const {
  // Loading
  setGlobalLoading,
  setLoadingState,
  
  // Toasts
  addToast,
  removeToast,
  clearToasts,
  
  // Modals
  openModal,
  closeModal,
  closeTopModal,
  clearModals,
  
  // Sidebars
  toggleLeftSidebar,
  setLeftSidebar,
  toggleRightSidebar,
  setRightSidebar,
  
  // Mobile
  setIsMobile,
  toggleMobileMenu,
  setMobileMenu,
  
  // Theme
  setTheme,
  toggleTheme,
  
  // Feed
  setFeedType,
  setFeedFilter,
  
  // Post form
  togglePostForm,
  setPostFormOpen,
  updatePostFormContent,
  setPostFormCommunity,
  setPostFormParent,
  addPostFormMedia,
  removePostFormMedia,
  resetPostForm,
  
  // Search
  toggleSearch,
  setSearchOpen,
  setSearchQuery,
  setSearchLoading,
  setSearchResults,
  clearSearchResults,
  
  // Notifications
  toggleNotificationsPanel,
  setNotificationsPanelOpen,
  
  // Profile menu
  toggleProfileMenu,
  setProfileMenuOpen,
  
  // Utility
  closeAllPanels,
  resetUI
} = uiSlice.actions

export default uiSlice.reducer
