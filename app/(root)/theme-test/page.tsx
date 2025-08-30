'use client'

import { useSession } from 'next-auth/react'
import { useTheme } from '@/lib/theme'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { IconSun, IconMoon, IconDeviceDesktop, IconDatabase, IconDeviceSdCard } from '@tabler/icons-react'

export default function ThemeTestPage() {
  const { data: session, status } = useSession()
  const { theme, setTheme, resolvedTheme } = useTheme()

  const themeButtons = [
    { value: 'light', label: 'Light', icon: IconSun },
    { value: 'dark', label: 'Dark', icon: IconMoon },
    { value: 'system', label: 'System', icon: IconDeviceDesktop },
  ] as const

  return (
    <div className="container mx-auto p-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Theme Database Storage Test</h1>
        <p className="text-muted-foreground">
          Test the new database-backed theme system
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Theme Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconDatabase className="h-5 w-5" />
              Theme Controls
            </CardTitle>
            <CardDescription>
              Change your theme preference (saved to database when authenticated)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {themeButtons.map(({ value, label, icon: Icon }) => (
                <Button
                  key={value}
                  variant={theme === value ? "default" : "outline"}
                  onClick={() => setTheme(value)}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm">{label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Current State */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconDeviceSdCard className="h-5 w-5" />
              Current State
            </CardTitle>
            <CardDescription>
              Current theme settings and storage information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Selected Theme:</span>
                <Badge variant="secondary">{theme || 'loading...'}</Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Resolved Theme:</span>
                <Badge variant="outline">{resolvedTheme || 'loading...'}</Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Storage:</span>
                <Badge variant={status === 'authenticated' ? 'default' : 'secondary'}>
                  {status === 'authenticated' ? 'Database' : 'localStorage'}
                </Badge>
              </div>
              
              {status === 'authenticated' && session?.user?.preferences && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-1">Database Preferences:</p>
                  <pre className="text-xs text-muted-foreground">
                    {JSON.stringify(session.user.preferences, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <h4 className="font-medium">🔐 Authenticated Users:</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Theme preference saved to database</li>
                <li>Syncs across all devices and browsers</li>
                <li>Persists after logout/login</li>
                <li>Check the "Database Preferences" section above</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium">👤 Guest Users:</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Theme preference saved to localStorage</li>
                <li>Works only on current browser</li>
                <li>Lost when cookies/storage cleared</li>
                <li>Automatically migrates to database on login</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
