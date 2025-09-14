'use client'

import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FaGoogle, FaGithub, FaMicrosoft } from 'react-icons/fa'

export default function AuthPage() {
  return (
    <div className="flex items-center justify-center w-full">
      <Card className="w-full max-w-md mx-auto shadow-2xl bg-glassmorphism dark:bg-glassmorphism-dark backdrop-blur-xl border border-glass-border dark:border-glass-border-dark">
      <CardHeader className="space-y-1 text-center pb-8">
        <div className="mx-auto mb-4 w-16 h-16 bg-primary-500/20 border border-primary-500/30 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/20">
          <span className="text-2xl font-bold text-primary-500">T</span>
        </div>
        <CardTitle className="text-3xl font-bold text-black dark:text-white">
          Welcome to Threble
        </CardTitle>
        <CardDescription className="text-base text-black/70 dark:text-white/70">
          Choose your preferred authentication method
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 px-8 pb-8">
        <Button
          onClick={() => signIn('google', { callbackUrl: '/onboarding' })}
          variant="outline"
          className="w-full h-12 bg-white/90 dark:bg-white/10 text-black dark:text-white hover:bg-white dark:hover:bg-white/20 backdrop-blur-sm border border-glass-border dark:border-glass-border-dark flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 hover:shadow-lg"
        >
          <FaGoogle className="w-5 h-5 text-red-500" />
          Continue with Google
        </Button>
        <Button
          onClick={() => signIn('github', { callbackUrl: '/onboarding' })}
          variant="outline"
          className="w-full h-12 bg-gray-900/90 dark:bg-gray-800/90 text-white hover:bg-gray-900 dark:hover:bg-gray-800 backdrop-blur-sm border border-glass-border dark:border-glass-border-dark flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 hover:shadow-lg"
        >
          <FaGithub className="w-5 h-5" />
          Continue with GitHub
        </Button>
        <Button
          onClick={() => signIn('azure-ad', { callbackUrl: '/onboarding' })}
          variant="outline"
          className="w-full h-12 bg-blue-600/90 dark:bg-blue-500/90 text-white hover:bg-blue-600 dark:hover:bg-blue-500 backdrop-blur-sm border border-glass-border dark:border-glass-border-dark flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 hover:shadow-lg"
        >
          <FaMicrosoft className="w-5 h-5" />
          Continue with Microsoft
        </Button>
      </CardContent>
    </Card>
    </div>
  )
}