"use client"

import { useTheme } from "next-themes"
import { useSession } from "next-auth/react"
import { useCallback } from "react"
import { useToast } from "@/hooks/use-toast"

export function useThemeWithDb() {
  const { theme, setTheme: setNextTheme, systemTheme, resolvedTheme } = useTheme()
  const { data: session, update } = useSession()
  const { toast } = useToast()

  const setTheme = useCallback(async (newTheme: 'light' | 'dark' | 'system') => {
    try {
      // Set theme immediately for instant feedback
      setNextTheme(newTheme)

      // If user is authenticated, save to database
      if (session?.user?.id) {
        const response = await fetch('/api/user/preferences', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ theme: newTheme }),
        })

        if (!response.ok) {
          throw new Error('Failed to save theme preference')
        }

        // Update session to reflect the new preference
        await update()
      } else {
        // For unauthenticated users, save to localStorage
        localStorage.setItem('theme', newTheme)
      }
    } catch (error) {
      console.error('Failed to save theme preference:', error)
      toast({
        title: "Error",
        description: "Failed to save theme preference. Please try again.",
        variant: "destructive",
      })
    }
  }, [session, setNextTheme, update])

  return {
    theme,
    systemTheme,
    resolvedTheme,
    setTheme,
  }
}
