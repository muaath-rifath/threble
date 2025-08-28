# Database Theme Storage Implementation

This implementation moves user theme preferences from client-side localStorage to server-side database storage, providing a consistent theme experience across devices and sessions.

## Features

- ✅ **Database Storage**: Theme preferences stored in user's `preferences` JSON field
- ✅ **Cross-Device Sync**: Theme preference syncs across all user devices
- ✅ **Fallback Support**: Falls back to localStorage for unauthenticated users
- ✅ **Real-time Updates**: Theme changes are immediately saved and synced
- ✅ **Session Integration**: Theme preferences included in NextAuth session
- ✅ **Type Safety**: Full TypeScript support with proper type definitions

## Implementation Details

### Database Schema
```prisma
model User {
  id          String   @id @default(cuid())
  preferences Json?    @default("{}")
  // ... other fields
}
```

The `preferences` field stores theme preferences in this format:
```json
{
  "theme": "light" | "dark" | "system"
}
```

### API Endpoints

#### `GET /api/user/preferences`
Retrieves user preferences including theme.

#### `PUT /api/user/preferences`  
Updates user preferences (merges with existing).

#### `PATCH /api/user/preferences`
Updates only theme preference for quick theme changes.

### Components

#### `DatabaseThemeProvider`
Custom theme provider that:
- Reads initial theme from user session/database
- Falls back to localStorage for unauthenticated users
- Handles loading states properly
- Prevents flash of wrong theme

#### `useThemeWithDb` Hook
Custom hook that:
- Provides theme state and setter
- Automatically saves theme changes to database
- Shows toast notifications on save errors
- Updates session after theme changes

### Session Integration

Theme preferences are included in NextAuth session:
```typescript
// types/next-auth.d.ts
interface Session {
  user: {
    preferences?: Record<string, any>
    // ... other fields
  }
}
```

### Migration

Run the migration script for existing users:
```bash
npx tsx scripts/migrate-theme-preferences.ts
```

## Usage

### In Components
```tsx
import { useThemeWithDb } from "@/hooks/use-theme-with-db"

function MyComponent() {
  const { theme, setTheme } = useThemeWithDb()
  
  const handleThemeChange = () => {
    setTheme('dark') // Automatically saves to database
  }
  
  return <button onClick={handleThemeChange}>Switch to Dark</button>
}
```

### In Theme Provider
```tsx
// app/layout.tsx
import { DatabaseThemeProvider } from "@/components/database-theme-provider"

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <SessionProvider>
          <DatabaseThemeProvider>
            {children}
          </DatabaseThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
```

## Benefits

1. **Consistent Experience**: Same theme across all devices and browsers
2. **No Flash**: Proper loading prevents flash of wrong theme
3. **Fallback Support**: Works for both authenticated and unauthenticated users
4. **Performance**: Minimal database queries with session caching
5. **Extensible**: Easy to add more user preferences in the future

## Files Modified

- `app/api/user/preferences/route.ts` - New API endpoint
- `app/api/auth/[...nextauth]/options.ts` - Include preferences in session
- `components/database-theme-provider.tsx` - New theme provider
- `hooks/use-theme-with-db.ts` - New theme hook
- `components/shared/ProfileDropdown.tsx` - Updated to use new hook
- `components/ui/mode-toggle.tsx` - Updated to use new hook
- `app/layout.tsx` - Use new theme provider
- `types/next-auth.d.ts` - Added preferences to session type
- `scripts/migrate-theme-preferences.ts` - Migration script

## Testing

1. **Login Flow**: Theme should load from database on login
2. **Cross-Device**: Change theme on one device, verify it syncs to others
3. **Guest Users**: Theme should still work for unauthenticated users
4. **Error Handling**: Network errors should show appropriate messages
5. **Performance**: No noticeable delay in theme changes
