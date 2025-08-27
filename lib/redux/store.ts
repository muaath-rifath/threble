    import { configureStore } from '@reduxjs/toolkit'
import postsReducer from './slices/postsSlice'
import reactionsReducer from './slices/reactionsSlice'
import notificationsReducer from './slices/notificationsSlice'
import communitiesReducer from './slices/communitiesSlice'
import eventsReducer from './slices/eventsSlice'
import uiReducer from './slices/uiSlice'

export const store = configureStore({
  reducer: {
    posts: postsReducer,
    reactions: reactionsReducer,
    notifications: notificationsReducer,
    communities: communitiesReducer,
    events: eventsReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types and paths that may contain non-serializable values
        ignoredActions: [
          'ui/addPostFormMedia',
          'posts/fetchPosts/fulfilled',
          'posts/createPost/fulfilled',
          'reactions/addReaction/fulfilled',
          'reactions/removeReaction/fulfilled',
          'reactions/removeReaction/rejected',
        ],
        ignoredPaths: [
          'ui.postFormData.mediaFiles',
          'posts.posts',
          'reactions.reactions',
        ],
      },
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
