'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useAppDispatch, useAppSelector } from './redux/hooks'
import { setTheme } from './redux/slices/uiSlice'

export type Theme = 'light' | 'dark' | 'system'

// Theme utilities
export const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const getResolvedTheme = (theme: Theme): 'light' | 'dark' => {
  return theme === 'system' ? getSystemTheme() : theme
}

// Cookie utilities
export const setThemeCookie = (theme: Theme) => {
  document.cookie = `theme=${theme}; path=/; max-age=${60 * 60 * 24 * 365}` // 1 year
}

export const getThemeCookie = (): Theme | null => {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/theme=([^;]+)/)
  const theme = match?.[1] as Theme
  return theme && ['light', 'dark', 'system'].includes(theme) ? theme : null
}

// Database sync utility
const syncThemeToDatabase = async (theme: Theme) => {
  try {
    await fetch('/api/user/theme', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme })
    })
  } catch (error) {
    console.error('Failed to sync theme to database:', error)
  }
}

// Theme hook
export const useTheme = () => {
  const dispatch = useAppDispatch()
  const themeFromRedux = useAppSelector(state => state.ui.theme)
  const { data: session, status } = useSession()
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize theme on mount
  useEffect(() => {
    if (isInitialized) return

    let initialTheme: Theme = 'system'

    // Priority: session > cookie > system
    if (session?.user?.preferences?.theme) {
      initialTheme = session.user.preferences.theme as Theme
    } else {
      const cookieTheme = getThemeCookie()
      if (cookieTheme) {
        initialTheme = cookieTheme
      }
    }

    dispatch(setTheme(initialTheme))
    setIsInitialized(true)
  }, [session, dispatch, isInitialized])

  // Listen to system theme changes
  useEffect(() => {
    if (themeFromRedux !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      // Force a re-render to apply the new system theme
      document.documentElement.className = getResolvedTheme('system')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [themeFromRedux])

  // Apply theme to DOM
  useEffect(() => {
    const resolvedTheme = getResolvedTheme(themeFromRedux)
    document.documentElement.className = resolvedTheme
  }, [themeFromRedux])

  const setThemeValue = async (theme: Theme) => {
    dispatch(setTheme(theme))
    setThemeCookie(theme)
    
    // Sync to database if user is authenticated
    if (status === 'authenticated') {
      await syncThemeToDatabase(theme)
    }
  }

  return {
    theme: themeFromRedux,
    resolvedTheme: getResolvedTheme(themeFromRedux),
    setTheme: setThemeValue,
    systemTheme: getSystemTheme(),
    isInitialized
  }
}

// Theme Provider Component
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { isInitialized } = useTheme()

  // Prevent flash by not rendering until theme is initialized
  if (!isInitialized) {
    return children
  }

  return children as React.ReactElement
}

// Server-side utilities
export const getInitialTheme = (): Theme => {
  if (typeof document === 'undefined') return 'system'
  return getThemeCookie() || 'system'
}
