'use client'

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form"
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useState } from 'react'
import { useToast } from "@/hooks/use-toast"

interface CommentSectionProps {
  postId: string;
}

const commentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty"),
})

export function CommentSection({ postId }: CommentSectionProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<z.infer<typeof commentSchema>>({
    resolver: zodResolver(commentSchema),
    defaultValues: { content: '' },
  })

  const onSubmitComment = async (values: z.infer<typeof commentSchema>) => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      if (response.ok) {
        toast({ title: "Comment added", description: "Your comment has been successfully added." })
        form.reset()
      } else {
        throw new Error('Failed to add comment')
      }
    } catch (error) {
      console.error('Error adding comment:', error)
      toast({
        title: "Error",
        description: "Failed to add comment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mt-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmitComment)} className="mb-4">
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    placeholder="Write a comment..."
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isSubmitting} className="mt-2">
            {isSubmitting ? 'Posting...' : 'Post Comment'}
          </Button>
        </form>
      </Form>
    </div>
  )
}
