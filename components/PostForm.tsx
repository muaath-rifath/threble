'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';

const postFormSchema = z.object({
  content: z.string().min(1, "Post content cannot be empty"),
});

export default function PostForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof postFormSchema>>({
    resolver: zodResolver(postFormSchema),
    defaultValues: { content: '' },
  });

  async function onSubmit(values: z.infer<typeof postFormSchema>) {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        toast({ title: "Post created", description: "Your post has been successfully created." });
        form.reset();
      } else {
        throw new Error('Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  placeholder="What's on your mind?"
                  className="min-h-[100px] resize-none"
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" className="mt-2" disabled={isSubmitting}>
          {isSubmitting ? 'Posting...' : 'Post'}
        </Button>
      </form>
    </Form>
  );
}
