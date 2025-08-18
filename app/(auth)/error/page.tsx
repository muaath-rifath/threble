'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, Home, ArrowLeft } from 'lucide-react'

const errorMessages: Record<string, string> = {
  Configuration: 'There is a problem with the server configuration.',
  AccessDenied: 'You do not have permission to sign in.',
  Verification: 'The verification token has expired or has already been used.',
  OAuthCallback: 'There was an error with the OAuth callback. This could be due to:',
  OAuthAccountNotLinked: 'To confirm your identity, sign in with the same account you used originally.',
  EmailCreateAccount: 'Could not create account with email.',
  Callback: 'There was an error in the callback handler.',
  OAuthCreateAccount: 'Could not create OAuth account.',
  EmailSignin: 'Check your email for the signin link.',
  CredentialsSignin: 'Sign in failed. Check the details you provided are correct.',
  SessionRequired: 'Please sign in to access this page.',
}

// Component that uses useSearchParams
function AuthError() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  
  const errorMessage = error ? errorMessages[error] : 'An unknown error occurred.'
  
  const getOAuthCallbackHelp = () => {
    if (error === 'OAuthCallback') {
      return (
        <div className="mt-4 p-4 glass-card rounded-2xl">
          <h4 className="font-semibold text-black dark:text-white mb-2">Common OAuth Issues:</h4>
          <ul className="text-sm text-black/60 dark:text-white/60 space-y-1">
            <li>• Check if your OAuth app callback URL is set to: <code className="bg-black/10 dark:bg-white/10 px-1 rounded">http://localhost:3000/api/auth/callback/github</code></li>
            <li>• Verify your CLIENT_ID and CLIENT_SECRET are correct</li>
            <li>• Make sure there are no extra spaces in your environment variables</li>
            <li>• Check if your OAuth app is active and not suspended</li>
          </ul>
        </div>
      )
    }
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="glass-card max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 text-red-500">
            <AlertCircle className="h-12 w-12" />
          </div>
          <CardTitle className="text-xl text-black dark:text-white">Authentication Error</CardTitle>
          <CardDescription className="text-black/60 dark:text-white/60">
            {error ? `Error: ${error}` : 'Unknown error occurred'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-black/80 dark:text-white/80 mb-4">
            {errorMessage}
          </p>
          {getOAuthCallbackHelp()}
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button asChild className="w-full primary-button">
            <Link href="/signin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Try Again
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full glass-button">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

// Loading fallback component
function AuthErrorFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="glass-card max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-xl text-black dark:text-white">Loading...</CardTitle>
        </CardHeader>
      </Card>
    </div>
  )
}

// Main page component with Suspense
export default function AuthErrorPage() {
  return (
    <Suspense fallback={<AuthErrorFallback />}>
      <AuthError />
    </Suspense>
  )
}