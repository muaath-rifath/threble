import { Providers } from '@/app/providers'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Providers>
      <div className="min-h-screen bg-background dark:bg-black relative overflow-hidden">
        {/* Animated geometric pattern background */}
        <div className="absolute inset-0">
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="emerald-grid" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                <circle cx="30" cy="30" r="1.5" fill="rgb(16 185 129)" opacity="0.1">
                  <animate attributeName="opacity" values="0.1;0.3;0.1" dur="4s" repeatCount="indefinite" />
                </circle>
                <circle cx="0" cy="0" r="1" fill="rgb(16 185 129)" opacity="0.05">
                  <animate attributeName="opacity" values="0.05;0.2;0.05" dur="6s" repeatCount="indefinite" />
                </circle>
                <circle cx="60" cy="60" r="1" fill="rgb(16 185 129)" opacity="0.05">
                  <animate attributeName="opacity" values="0.05;0.2;0.05" dur="5s" repeatCount="indefinite" />
                </circle>
              </pattern>
              <linearGradient id="emerald-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgb(16 185 129)" stopOpacity="0.1">
                  <animate attributeName="stop-opacity" values="0.1;0.2;0.1" dur="8s" repeatCount="indefinite" />
                </stop>
                <stop offset="50%" stopColor="rgb(16 185 129)" stopOpacity="0.05" />
                <stop offset="100%" stopColor="rgb(16 185 129)" stopOpacity="0.15">
                  <animate attributeName="stop-opacity" values="0.15;0.3;0.15" dur="6s" repeatCount="indefinite" />
                </stop>
              </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#emerald-grid)" />
            <rect width="100%" height="100%" fill="url(#emerald-gradient)" />
          </svg>
        </div>

        {/* Floating geometric shapes */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/6 w-20 h-20 border border-emerald-500/20 rounded-full animate-spin" style={{ animationDuration: '20s' }}>
            <div className="absolute inset-2 border border-emerald-500/30 rounded-full animate-spin" style={{ animationDuration: '15s', animationDirection: 'reverse' }}></div>
          </div>
          <div className="absolute bottom-1/4 right-1/5 w-16 h-16 bg-emerald-500/10 rotate-45 animate-pulse">
            <div className="absolute inset-2 bg-emerald-500/20 animate-spin" style={{ animationDuration: '10s' }}></div>
          </div>
          <div className="absolute top-3/4 left-1/3 w-12 h-12 border-2 border-emerald-500/25 rotate-45 animate-bounce">
            <div className="absolute inset-1 border border-emerald-500/40 rotate-45"></div>
          </div>
          <div className="absolute top-1/2 right-1/3 w-24 h-24 border border-emerald-500/15 rounded-full animate-pulse">
            <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-emerald-500/50 rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-ping"></div>
          </div>
        </div>

        {/* Animated wave effect */}
        <div className="absolute bottom-0 left-0 right-0 h-32 overflow-hidden">
          <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-emerald-500/5 to-transparent animate-pulse"></div>
        </div>

        {/* Main content */}
        <div className="flex items-center justify-center min-h-screen relative z-10 px-4 py-8">
          <div className="w-full max-w-4xl mx-auto">
            {children}
          </div>
        </div>
      </div>
    </Providers>
  )
}
