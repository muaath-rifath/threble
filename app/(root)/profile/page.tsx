'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Image from 'next/image'
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ProfileData {
  name?: string;
  email?: string;
  image?: string;
  coverImage?: string;
  profile?: {
    bio?: string;
    image?: string;
    coverImage?: string;
  };
}

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email.",
  }),
  bio: z.string().max(160).optional(),
  image: z.string().url().optional().or(z.literal('')),
  coverImage: z.string().url().optional().or(z.literal('')),
})

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [profileData, setProfileData] = useState<ProfileData | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      bio: '',
      image: '',
      coverImage: '',
    },
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/signin')
    } else if (status === 'authenticated' && session?.user) {
      fetchProfile()
    }
  }, [status, session, router])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/user/profile')
      if (response.ok) {
        const data: ProfileData = await response.json()
        setProfileData(data)
        form.reset({
          name: data.name || '',
          email: data.email || '',
          bio: data.profile?.bio || '',
          image: data.profile?.image || data.image || '',
          coverImage: data.profile?.coverImage || data.coverImage || '',
        })
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      toast({
        title: "Error",
        description: "Failed to fetch profile. Please try again.",
        variant: "destructive",
      })
    }
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (response.ok) {
        toast({
          title: "Profile updated",
          description: "Your profile has been successfully updated.",
        })
        fetchProfile() // Refetch profile data after update
      } else {
        throw new Error('Failed to update profile')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  const profileImage = profileData?.profile?.image || profileData?.image || '/default-avatar.png'
  const coverImage = profileData?.profile?.coverImage || profileData?.coverImage || '/default-cover.jpg'

  return (
    <div className="flex flex-col space-y-4 p-4">
      <Card className="w-full">
        <CardContent className="p-0  rounded-t-lg">
          <div className="relative h-48">
            <Image
              src={coverImage}
              alt="Cover Photo"
              layout="fill"
              objectFit="cover"
              className='rounded-t-lg'
            />
          </div>
          <div className="flex justify-between items-end px-4 -mt-28 relative">
            <Avatar className="w-36 h-36 border-2 border-white">
              <AvatarImage src={profileImage} alt="Profile" />
              <AvatarFallback>{profileData?.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <Button size="sm" className="mt-2">Edit Profile</Button>
          </div>
          <div className="pt-1 p-4">
            <h1 className="text-2xl font-bold">{profileData?.name}</h1>
            <p className="text-sm text-gray-600">{profileData?.profile?.bio}</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="about" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger 
            value="about" 
            className="flex-1 relative after:absolute after:bottom-0 after:left-1/2 after:transform after:-translate-x-1/2 after:w-1/2 after:h-0.5 after:bg-primary-500 after:transition-all after:duration-300 data-[state=active]:after:w-1/2 data-[state=active]:after:opacity-100 after:opacity-0"
          >
            About
          </TabsTrigger>
          <TabsTrigger 
            value="posts" 
            className="flex-1 relative after:absolute after:bottom-0 after:left-1/2 after:transform after:-translate-x-1/2 after:w-1/2 after:h-0.5 after:bg-primary-500 after:transition-all after:duration-300 data-[state=active]:after:w-1/2 data-[state=active]:after:opacity-100 after:opacity-0"
          >
            Posts
          </TabsTrigger>
          <TabsTrigger 
            value="photos" 
            className="flex-1 relative after:absolute after:bottom-0 after:left-1/2 after:transform after:-translate-x-1/2 after:w-1/2 after:h-0.5 after:bg-primary-500 after:transition-all after:duration-300 data-[state=active]:after:w-1/2 data-[state=active]:after:opacity-100 after:opacity-0"
          >
            Photos
          </TabsTrigger>
        </TabsList>
        <TabsContent value="about">
          <Card>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} disabled />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bio</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormDescription>
                          Write a short bio about yourself. Max 160 characters.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="image"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profile Image URL</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="coverImage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cover Image URL</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className='bg-primary-500'>Update Profile</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="posts">
          <Card>
            <CardContent>
              <p className="text-center py-4">Your posts will appear here.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="photos">
          <Card>
            <CardContent>
              <p className="text-center py-4">Your photos will appear here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
