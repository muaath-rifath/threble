'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

const onboardingSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  bio: z.string().max(160, 'Bio must be 160 characters or less').optional(),
  avatar: z.string().url('Invalid URL').optional(),
  location: z.string().max(100, 'Location must be 100 characters or less').optional(),
  website: z.string().url('Invalid URL').optional(),
  birthDate: z.string().optional().refine((date) => !date || !isNaN(Date.parse(date)), {
    message: 'Invalid date format',
  }),
})

type OnboardingInput = z.infer<typeof onboardingSchema>

export default function OnboardingPage() {
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { data: session, status, update } = useSession()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/signin')
    } else if (status === 'authenticated' && session?.user.hasProfile) {
      router.push('/')
    }
  }, [status, session, router])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
  })

  const onSubmit = async (data: OnboardingInput) => {
    try {
      const response = await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, userId: session?.user.id }),
      })

      if (response.ok) {
        await update({ ...session, user: { ...session?.user, hasProfile: true } })
        router.push('/')
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'An error occurred during onboarding.')
      }
    } catch (error) {
      setError('An error occurred during onboarding. Please try again.')
    }
  }

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  if (status === 'unauthenticated' || (status === 'authenticated' && session?.user.hasProfile)) {
    return null
  }

  return (
    <Card className="w-[450px]">
      <CardHeader>
        <CardTitle>Complete Your Profile</CardTitle>
        <CardDescription>We need a few more details to set up your account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" {...register('username')} />
              {errors.username && (
                <p className="text-sm text-red-500">{errors.username.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" {...register('bio')} />
              {errors.bio && (
                <p className="text-sm text-red-500">{errors.bio.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="avatar">Avatar URL</Label>
              <Input id="avatar" type="url" {...register('avatar')} />
              {errors.avatar && (
                <p className="text-sm text-red-500">{errors.avatar.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" {...register('location')} />
              {errors.location && (
                <p className="text-sm text-red-500">{errors.location.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" type="url" {...register('website')} />
              {errors.website && (
                <p className="text-sm text-red-500">{errors.website.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="birthDate">Birth Date</Label>
              <Input id="birthDate" type="date" {...register('birthDate')} />
              {errors.birthDate && (
                <p className="text-sm text-red-500">{errors.birthDate.message}</p>
              )}
            </div>
            <Button type="submit" disabled={isSubmitting} className="bg-primary-500">
              {isSubmitting ? 'Saving...' : 'Complete Profile'}
            </Button>
          </div>
        </form>
      </CardContent>
      <CardFooter>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </CardFooter>
    </Card>
  )
}
