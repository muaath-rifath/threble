'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThumbsUp, MessageSquare, Share2 } from 'lucide-react';
import { ExtendedPost } from '@/lib/types';

interface FeedListProps {
  initialPosts: ExtendedPost[];
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
}

export default function FeedList({ initialPosts }: FeedListProps) {
  const [posts, setPosts] = useState(initialPosts);

  const handleReaction = async (postId: string, type: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      if (response.ok) {
        // Update the posts state with the new reaction
        setPosts(prevPosts => prevPosts.map(post => {
          if (post.id === postId) {
            const newReaction = {
              id: 'temp',
              type,
              userId: 'currentUserId',
              postId,
              createdAt: new Date().toISOString(),
              commentId: null
            };
            return {
              ...post,
              reactions: [...post.reactions, newReaction],
            };
          }
          return post;
        }));
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <Card key={post.id}>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Avatar>
                <AvatarImage src={post.author.image || undefined} />
                <AvatarFallback>{post.author.name?.charAt(0) || '?'}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{post.author.name}</p>
                <p className="text-sm text-gray-500">{formatDate(post.createdAt)}</p>
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
              className={post.reactions.some(r => r.userId === 'currentUserId' && r.type === 'LIKE') ? 'text-blue-500' : ''}
            >
              <ThumbsUp className="mr-2 h-4 w-4" />
              Like ({post.reactions.filter(r => r.type === 'LIKE').length})
            </Button>
            <Button variant="ghost">
              <MessageSquare className="mr-2 h-4 w-4" />
              Comment ({post._count.replies})
            </Button>
            <Button variant="ghost">
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
