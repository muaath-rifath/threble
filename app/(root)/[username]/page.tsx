'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarDays, MapPin, Link as LinkIcon, Calendar } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import UserPostsByUsername from '@/components/post/UserPostsByUsername'
import PublicUserPostList from '@/components/post/PublicUserPostList'

interface UserProfile {
  id: string;
  name?: string;
  username: string;
  email?: string;
  image?: string;
  coverImage?: string;
  createdAt: string;
  profile?: {
    bio?: string;
    location?: string;
    website?: string;
    birthDate?: string;
  };
  _count?: {
    posts: number;
    followers: number;
    following: number;
  };
}

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)

  const username = params.username as string

  useEffect(() => {
    if (username) {
      fetchUserProfile()
    }
  }, [username])

  const fetchUserProfile = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/user/profile/${username}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('User not found')
        } else {
          setError('Failed to load profile')
        }
        return
      }

      const data = await response.json()
      setUserProfile(data.user)
      setIsFollowing(data.isFollowing || false)
    } catch (error) {
      console.error('Error fetching user profile:', error)
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async () => {
    if (!session) {
      router.push('/signin')
      return
    }

    try {
      const response = await fetch(`/api/user/follow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: userProfile?.id,
          action: isFollowing ? 'unfollow' : 'follow'
        }),
      })

      if (response.ok) {
        setIsFollowing(!isFollowing)
        // Optionally refresh the profile to get updated counts
        fetchUserProfile()
      }
    } catch (error) {
      console.error('Error following/unfollowing user:', error)
    }
  }

  const isOwnProfile = session?.user?.username === username

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (error || !userProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">{error || 'User not found'}</h1>
        <p className="text-gray-600 mb-4">The user you're looking for doesn't exist or has been removed.</p>
        <Button onClick={() => router.push('/')}>Go Home</Button>
      </div>
    )
  }

  const joinDate = new Date(userProfile.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  })

  return (
    <div className="max-w-4xl mx-auto">
      {/* Cover Image */}
      <Card className="mb-4">
        <div className="relative h-48 bg-gradient-to-r from-blue-400 to-purple-500 rounded-t-lg">
          {userProfile.coverImage && (
            <img
              src={userProfile.coverImage}
              alt="Cover"
              className="w-full h-full object-cover rounded-t-lg"
            />
          )}
        </div>

        {/* Profile Info */}
        <div className="flex justify-between items-end px-6 -mt-16 relative">
          <div className="flex items-end space-x-4">
            <Avatar className="w-32 h-32 border-4 border-white shadow-lg">
              <AvatarImage src={userProfile.image} alt={userProfile.name} />
              <AvatarFallback className="text-2xl">
                {userProfile.name?.charAt(0) || userProfile.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col justify-end h-32 mb-4">
              <h1 className="text-2xl font-bold">{userProfile.name}</h1>
              <p className="text-gray-600">@{userProfile.username}</p>
            </div>
          </div>

          <div className="pb-4">
            {isOwnProfile ? (
              <Button asChild>
                <Link href="/profile">Edit Profile</Link>
              </Button>
            ) : (
              session && (
                <Button
                  variant={isFollowing ? "outline" : "default"}
                  onClick={handleFollow}
                >
                  {isFollowing ? 'Unfollow' : 'Follow'}
                </Button>
              )
            )}
          </div>
        </div>

        <CardContent className="pt-4">
          {/* Bio */}
          {userProfile.profile?.bio && (
            <p className="text-gray-700 mb-4">{userProfile.profile.bio}</p>
          )}

          {/* Profile Info */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
            {userProfile.profile?.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {userProfile.profile.location}
              </div>
            )}
            {userProfile.profile?.website && (
              <div className="flex items-center gap-1">
                <LinkIcon className="w-4 h-4" />
                <a 
                  href={userProfile.profile.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  {userProfile.profile.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Joined {joinDate}
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-6 text-sm">
            <div>
              <span className="font-bold">{userProfile._count?.posts || 0}</span>{' '}
              <span className="text-gray-600">Posts</span>
            </div>
            <div>
              <span className="font-bold">{userProfile._count?.following || 0}</span>{' '}
              <span className="text-gray-600">Following</span>
            </div>
            <div>
              <span className="font-bold">{userProfile._count?.followers || 0}</span>{' '}
              <span className="text-gray-600">Followers</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Tabs */}
      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="posts" className="flex-1">Posts</TabsTrigger>
          <TabsTrigger value="media" className="flex-1">Media</TabsTrigger>
          <TabsTrigger value="likes" className="flex-1">Likes</TabsTrigger>
        </TabsList>

        <TabsContent value="posts">
          <UserPostsByUsername username={username} session={session} type="posts" />
        </TabsContent>

        <TabsContent value="media">
          <UserPostsByUsername username={username} session={session} type="media" />
        </TabsContent>

        <TabsContent value="likes">
          <UserPostsByUsername username={username} session={session} type="likes" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
