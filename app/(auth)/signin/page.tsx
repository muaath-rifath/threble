'use client'

import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FaGoogle, FaGithub, FaMicrosoft } from 'react-icons/fa'

export default function SignInPage() {
  return (
    <Card className="w-[350px] shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Sign In</CardTitle>
        <CardDescription className="text-center">
          Choose a provider to sign in
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Button 
          onClick={() => signIn('google', { callbackUrl: '/onboarding' })} 
          variant="outline"
          className="w-full bg-white text-black hover:bg-gray-100 flex items-center justify-center gap-2"
        >
          <FaGoogle className="w-5 h-5 text-red-500" />
          Sign in with Google
        </Button>
        <Button 
          onClick={() => signIn('github', { callbackUrl: '/onboarding' })} 
          variant="outline"
          className="w-full bg-gray-900 text-white hover:bg-gray-800 flex items-center justify-center gap-2"
        >
          <FaGithub className="w-5 h-5" />
          Sign in with GitHub
        </Button>
        <Button 
          onClick={() => signIn('azure-ad', { callbackUrl: '/onboarding' })} 
          variant="outline"
          className="w-full bg-blue-500 text-white hover:bg-blue-600 flex items-center justify-center gap-2"
        >
          <FaMicrosoft className="w-5 h-5" />
          Sign in with Microsoft
        </Button>
      </CardContent>
    </Card>
  )
}
