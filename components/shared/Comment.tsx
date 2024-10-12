'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form"
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { ThumbsUp, MessageSquare } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"

interface Reply {
  id: string;
  content: string;
  author: {
    name: string;
    image: string;
  };
  createdAt: string;
  reactions: {
    type: string;
    userId: string;
  }[];
  replies: Reply[];
}

interface CommentProps {
  comment: Reply;
  postId: string;
  sessionUserId: string;
  fetchComments: () => void;
}

const replyFormSchema = z.object({
  content: z.string().min(1, "Reply cannot be empty"),
})

const Comment: React.FC<CommentProps> = ({ comment, postId, sessionUserId, fetchComments }) => {
  const { toast } = useToast()
  const [isReplying, setIsReplying] = useState(false)

  const replyForm = useForm<z.infer<typeof replyFormSchema>>({
    resolver: zodResolver(replyFormSchema),
    defaultValues: { content: '' },
  })

  const onSubmitReply = async (values: z.infer<typeof replyFormSchema>) => {
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, parentId: comment.id }),
      })

      if (response.ok) {
        toast({ title: "Reply added", description: "Your reply has been successfully added." })
        replyForm.reset()
        fetchComments()
        setIsReplying(false)
      } else {
        throw new Error('Failed to add reply')
      }
    } catch (error) {
      console.error('Error adding reply:', error)
      toast({
        title: "Error",
        description: "Failed to add reply. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleReaction = async (type: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, commentId: comment.id }),
      })

      if (response.ok) {
        fetchComments()
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

  return (
    <div className="ml-8 mt-4">
      <div className="flex items-start space-x-2">
        <Avatar className="w-8 h-8">
          <AvatarImage src={comment.author.image || undefined} />
          <AvatarFallback>{comment.author.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-grow">
          <div className="bg-glassmorphism dark:bg-glassmorphism-dark rounded-lg p-2">
            <p className="font-semibold text-sm">{comment.author.name}</p>
            <p className="text-sm">{comment.content}</p>
            <span className="text-xs text-gray-500">{new Date(comment.createdAt).toLocaleString()}</span>
          </div>
          <div className="flex items-center mt-1 space-x-2 text-xs text-gray-500">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleReaction('LIKE')}
              className={comment.reactions.some(r => r.userId === sessionUserId && r.type === 'LIKE') ? 'text-blue-500' : ''}
            >
              <ThumbsUp className="h-3 w-3 mr-1" />
              Like ({comment.reactions.filter(r => r.type === 'LIKE').length})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsReplying(!isReplying)}
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              Reply
            </Button>
          </div>
          {isReplying && (
            <Form {...replyForm}>
              <form onSubmit={replyForm.handleSubmit(onSubmitReply)} className="mt-2">
                <FormField
                  control={replyForm.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="Write a reply..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button type="submit" size="sm" className="mt-2">Reply</Button>
              </form>
            </Form>
          )}
        </div>
      </div>
      {comment.replies && comment.replies.map((reply) => (
        <Comment
          key={reply.id}
          comment={reply}
          postId={postId}
          sessionUserId={sessionUserId}
          fetchComments={fetchComments}
        />
      ))}
    </div>
  )
}

export default Comment
