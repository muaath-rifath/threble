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
          <Card>
            <CardContent>
              <p className="text-center py-4">Your posts will appear here.</p>
            </CardContent>
          </Card>
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