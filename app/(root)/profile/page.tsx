'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Camera, Pencil } from 'lucide-react'
import ReactCrop, { Crop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { uploadFileToBlobStorage } from '@/lib/azure-storage'
import { profileUpdateSchema, type ProfileUpdateInput } from '@/lib/validations/username'
import UserPostList from '@/components/post/UserPostList'

interface ProfileData {
  name?: string;
  email?: string;
  username?: string;
  image?: string;
  coverImage?: string;
  profile?: {
    bio?: string;
    location?: string;
    website?: string;
    birthDate?: string;
    image?: string;
    coverImage?: string;
  };
}

const formSchema = profileUpdateSchema

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [isProfileUploadOpen, setIsProfileUploadOpen] = useState(false)
  const [isCoverUploadOpen, setIsCoverUploadOpen] = useState(false)
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    x: 25,
    y: 25,
    width: 50,
    height: 50
  })
  const [imageRef, setImageRef] = useState<HTMLImageElement | null>(null)
  const [croppedProfileImage, setCroppedProfileImage] = useState<File | null>(null)
  const [croppedCoverImage, setCroppedCoverImage] = useState<File | null>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [isLoadingPosts, setIsLoadingPosts] = useState(false)

  const form = useForm<ProfileUpdateInput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      username: '',
      bio: '',
      location: '',
      website: '',
      birthDate: '',
    },
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/signin')
    } else if (status === 'authenticated' && session?.user) {
      fetchProfile()
      fetchPosts()
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
                    username: data.username || '',
                    bio: data.profile?.bio || '',
                    location: data.profile?.location || '',
                    website: data.profile?.website || '',
                    birthDate: data.profile?.birthDate ? new Date(data.profile.birthDate).toISOString().split('T')[0] : '',
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

    const fetchPosts = async () => {
        try {
            setIsLoadingPosts(true)
            const response = await fetch('/api/posts/user')
            if (response.ok) {
                const data = await response.json()
                setPosts(data.posts || [])
            }
        } catch (error) {
            console.error('Error fetching posts:', error)
            toast({
                title: "Error",
                description: "Failed to fetch posts. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsLoadingPosts(false)
        }
    }


  const handleImageUpload = async (file: File, type: 'profile' | 'cover') => {
    const reader = new FileReader()
      reader.onload = () => {
        if (type === 'profile') {
            setCroppedProfileImage(file)
          setIsProfileUploadOpen(true)
        } else {
             setCroppedCoverImage(file)
          setIsCoverUploadOpen(true)
        }
      }
    reader.readAsDataURL(file)
  }

  const handleCropComplete = async (crop: Crop, type: 'profile' | 'cover') => {
    if (!imageRef || !crop.width || !crop.height) return

    const canvas = document.createElement('canvas')
    const scaleX = imageRef.naturalWidth / imageRef.width
    const scaleY = imageRef.naturalHeight / imageRef.height
    canvas.width = crop.width
    canvas.height = crop.height
    const ctx = canvas.getContext('2d')

    if (ctx) {
      ctx.drawImage(
        imageRef,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        crop.width,
        crop.height
      )
    }

      // Convert canvas to blob and upload
      canvas.toBlob(async (blob) => {
          if (blob) {
              if(type === 'profile') {
                  setCroppedProfileImage(blob as File)
                  setIsProfileUploadOpen(false)
                } else {
                   setCroppedCoverImage(blob as File)
                   setIsCoverUploadOpen(false)
              }
          }
      })
    }

    const onSubmit = async (values: ProfileUpdateInput) => {
         try {
        const formData = new FormData()

            formData.append('name', values.name);
            formData.append('email', values.email);
            formData.append('username', values.username.toLowerCase());

            if(values.bio){
                formData.append('bio', values.bio)
            }

            if(values.location){
                formData.append('location', values.location)
            }

            if(values.website){
                formData.append('website', values.website)
            }

            if(values.birthDate){
                formData.append('birthDate', values.birthDate)
            }


        if (croppedProfileImage) {
            formData.append('image', croppedProfileImage);
          }
         if (croppedCoverImage) {
             formData.append('coverImage', croppedCoverImage);
         }

        const response = await fetch('/api/user/profile', {
            method: 'PUT',
            body: formData,
        })

            if (response.ok) {
                toast({
                    title: "Profile updated",
                    description: "Your profile has been successfully updated.",
                })
                fetchProfile();
            } else {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to update profile')
            }
        } catch (error) {
            console.error('Error updating profile:', error)
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to update profile. Please try again.",
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
        <CardContent className="p-0 rounded-t-lg">
          {/* Cover Image Section */}
          <div className="relative h-64">
            <Image
              src={coverImage}
              alt="Cover Photo"
              layout="fill"
              objectFit="cover"
              className="rounded-t-lg"
                onLoadingComplete={(image) => setImageRef(image)}
            />
            <Button
              variant="ghost"
              className="absolute bottom-4 right-4 bg-white/80 hover:bg-white"
              onClick={() => setIsCoverUploadOpen(true)}
            >
              <Camera className="mr-2 h-4 w-4" />
              Change Cover
            </Button>
          </div>

          {/* Profile Image Section */}
          <div className="flex justify-between items-end px-6 -mt-16 relative">
            <div className="relative group">
              <Avatar className="w-32 h-32 border-4 border-white shadow-lg">
                <AvatarImage src={profileImage} alt="Profile"  />
                <AvatarFallback>{profileData?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <Button
                variant="ghost"
                className="absolute bottom-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setIsProfileUploadOpen(true)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="p-6">
            <h1 className="text-2xl font-bold">{profileData?.name}</h1>
            <p className="text-sm text-gray-600">{profileData?.profile?.bio}</p>
          </div>
        </CardContent>
      </Card>

      {/* Image Upload Dialogs */}
      <Dialog open={isProfileUploadOpen} onOpenChange={setIsProfileUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Profile Picture</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <ReactCrop
                crop={crop}
              onChange={c => setCrop(c)}
              aspect={1}
                circularCrop
            >
                <Image
                    ref={setImageRef}
                    src={profileData?.profile?.image || profileData?.image || '/default-avatar.png'}
                    alt="Profile"
                    width={300}
                    height={300}
                />
            </ReactCrop>
            <div className="mt-4 flex justify-end space-x-2">
              <Button onClick={() => handleCropComplete(crop, 'profile')}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

        {/* Similar dialog for cover image */}
        <Dialog open={isCoverUploadOpen} onOpenChange={setIsCoverUploadOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Upload Cover Image</DialogTitle>
                </DialogHeader>
                <div className="mt-4">
                    <ReactCrop
                        crop={crop}
                        onChange={c => setCrop(c)}
                    >
                         <Image
                            ref={setImageRef}
                             src={profileData?.profile?.coverImage || profileData?.coverImage || '/default-cover.jpg'}
                            alt="Cover"
                            width={300}
                             height={100}
                            />
                    </ReactCrop>
                    <div className="mt-4 flex justify-end space-x-2">
                      <Button onClick={() => handleCropComplete(crop, 'cover')}>
                            Save
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>

      {/* Rest of the tabs and form content */}
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
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Enter your username"
                            className="lowercase"
                            onChange={(e) => {
                              e.target.value = e.target.value.toLowerCase();
                              field.onChange(e);
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          Only lowercase letters, numbers, and underscores allowed. No spaces.
                        </FormDescription>
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
                          <Textarea {...field} maxLength={160} />
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
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Where are you from?" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://yourwebsite.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="birthDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Birth Date</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" />
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

        {/* Other tabs remain unchanged */}

        {/* Posts Tab */}
        <TabsContent value="posts">
          {session ? (
            <>
              {isLoadingPosts ? (
                <Card>
                  <CardContent>
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent"></div>
                      <span className="ml-2 text-gray-600">Loading posts...</span>
                    </div>
                  </CardContent>
                </Card>
              ) : posts.length > 0 ? (
                <UserPostList initialPosts={posts} session={session} />
              ) : (
                <Card>
                  <CardContent>
                    <div className="text-center py-12">
                      <div className="mb-4">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No posts yet</h3>
                        <p className="text-gray-500 max-w-sm mx-auto">
                          Share your thoughts and ideas with the community. Your posts will appear here once you start creating content.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent>
                <p className="text-center py-4">Please sign in to view your posts.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Photos Tab */}
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