'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ThumbsUp, MessageSquare, Share2 } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { CommentSection } from '@/components/shared/CommentsSection'

interface Post {
  id: string;
  content: string;
  author: {
    name: string;
    image: string;
  };
  createdAt: string;
  reactions: { type: string; userId: string; }[];
  _count: {
    comments: number;
  };
}

export default function UserPostPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [posts, setPosts] = useState<Post[]>([])
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null)

  useEffect(() => {
    if (session) {
      fetchUserPosts()
    }
  }, [session])

  const fetchUserPosts = async () => {
    try {
      const response = await fetch('/api/posts/user')
      if (response.ok) {
        const data = await response.json()
        setPosts(data.posts)
      } else {
        console.error('Failed to fetch user posts:', response.statusText)
      }
    } catch (error) {
      console.error('Error fetching user posts:', error)
    }
  }

  const handleReaction = async (postId: string, type: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })

      if (response.ok) {
        fetchUserPosts()
      } else {
        throw new Error('Failed to add reaction')
      }
    } catch (error) {
      console.error('Error adding reaction:', error)
      toast({
        title: "Error",
        description: "Failed to add reaction. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleShare = (postId: string) => {
    console.log(`Sharing post ${postId}`)
    toast({ title: "Share", description: "Sharing functionality not implemented yet." })
  }

  if (!session) {
    return <div className="text-center mt-8">Please sign in to view your posts.</div>
  }

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <h1 className="text-2xl font-bold mb-6">Your Posts</h1>
      {posts.map((post) => (
        <Card key={post.id} className="mb-8">
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Avatar>
                <AvatarImage src={post.author.image || undefined} />
                <AvatarFallback>{post.author.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{post.author.name}</p>
                <p className="text-sm text-gray-500">{new Date(post.createdAt).toLocaleString()}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p>{post.content}</p>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="ghost" 
              onClick={() => handleReaction(post.id, 'LIKE')}
              className={post.reactions.some(r => r.userId === session.user.id && r.type === 'LIKE') ? 'text-blue-500' : ''}
            >
              <ThumbsUp className="mr-2 h-4 w-4" />
              Like ({post.reactions.filter(r => r.type === 'LIKE').length})
            </Button>
            <Button variant="ghost" onClick={() => setActiveCommentId(post.id)}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Comment ({post._count.comments})
            </Button>
            <Button variant="ghost" onClick={() => handleShare(post.id)}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </CardFooter>
          
          {activeCommentId === post.id && (
            <CardContent>
              <CommentSection postId={post.id} />
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  )
}
