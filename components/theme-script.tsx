const ThemeScript = () => {
  const script = `
    (function() {
      function getThemeFromCookie() {
        const match = document.cookie.match(/theme=([^;]+)/);
        const theme = match?.[1];
        return theme && ['light', 'dark', 'system'].includes(theme) ? theme : 'system';
      }

      function getSystemTheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }

      function applyTheme() {
        const theme = getThemeFromCookie();
        const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;
        document.documentElement.className = resolvedTheme;
      }

      // Apply theme immediately
      applyTheme();

      // Listen for system theme changes if using system theme
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', () => {
        const theme = getThemeFromCookie();
        if (theme === 'system') {
          applyTheme();
        }
      });
    })();
  `

  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
      suppressHydrationWarning
    />
  )
}

export default ThemeScript
