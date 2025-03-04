'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

// Component that uses useSearchParams
function AuthError() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="p-8 bg-white shadow-md rounded-lg">
        <h1 className="text-2xl font-bold mb-4">Authentication Error</h1>
        <p className="text-red-500">An error occurred during authentication: {error}</p>
      </div>
    </div>
  )
}

// Loading fallback component
function AuthErrorFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="p-8 bg-white shadow-md rounded-lg">
        <h1 className="text-2xl font-bold mb-4">Loading...</h1>
      </div>
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