import { IconMoon, IconSun, IconDeviceDesktop } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme, type Theme } from '@/lib/theme'

const ThemeToggle = () => {
  const { theme, setTheme, resolvedTheme } = useTheme()

  const themes: { value: Theme; label: string; icon: React.ReactNode }[] = [
    {
      value: 'light',
      label: 'Light',
      icon: <IconSun className="h-4 w-4" />
    },
    {
      value: 'dark', 
      label: 'Dark',
      icon: <IconMoon className="h-4 w-4" />
    },
    {
      value: 'system',
      label: 'System',
      icon: <IconDeviceDesktop className="h-4 w-4" />
    }
  ]

  const getCurrentIcon = () => {
    if (theme === 'system') {
      return <IconDeviceDesktop className="h-4 w-4" />
    }
    return resolvedTheme === 'dark' 
      ? <IconMoon className="h-4 w-4" />
      : <IconSun className="h-4 w-4" />
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          {getCurrentIcon()}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {themes.map(({ value, label, icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            className={`flex items-center gap-2 ${
              theme === value ? 'bg-accent' : ''
            }`}
          >
            {icon}
            <span>{label}</span>
            {theme === value && (
              <span className="ml-auto text-xs text-muted-foreground">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default ThemeToggle
