"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"

interface DatabaseThemeProviderProps extends Omit<ThemeProviderProps, 'defaultTheme'> {
  defaultTheme?: string
}

export function DatabaseThemeProvider({ 
  children, 
  attribute = "class",
  defaultTheme = "system",
  enableSystem = true,
  disableTransitionOnChange = false,
  ...props 
}: DatabaseThemeProviderProps) {
  const { data: session, status } = useSession()
  const [themeReady, setThemeReady] = useState(false)
  const [resolvedDefaultTheme, setResolvedDefaultTheme] = useState<string>(defaultTheme)

  // Get theme from user preferences when session loads
  useEffect(() => {
    if (status === "loading") {
      return // Still loading session
    }

    if (status === "authenticated" && session?.user?.preferences?.theme) {
      const userTheme = session.user.preferences.theme
      if (['light', 'dark', 'system'].includes(userTheme)) {
        setResolvedDefaultTheme(userTheme)
      }
      setThemeReady(true)
    } else if (status === "unauthenticated") {
      // For unauthenticated users, use localStorage as fallback
      try {
        const savedTheme = localStorage.getItem('theme')
        if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
          setResolvedDefaultTheme(savedTheme)
        }
      } catch (error) {
        // Handle cases where localStorage is not available
        console.warn('localStorage not available:', error)
      }
      setThemeReady(true)
    } else {
      setThemeReady(true)
    }
  }, [session, status, defaultTheme])

  // Don't render the provider until we've resolved the theme
  if (!themeReady) {
    return <div className="min-h-screen bg-background">{children}</div>
  }

  return (
    <NextThemesProvider
      attribute={attribute}
      defaultTheme={resolvedDefaultTheme}
      enableSystem={enableSystem}
      disableTransitionOnChange={disableTransitionOnChange}
      storageKey="theme" // Keep for fallback and unauthenticated users
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
