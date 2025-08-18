'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Image, Video, X } from 'lucide-react';

const postFormSchema = z.object({
  content: z.string().min(1, "Post content cannot be empty"),
});

interface PostFormProps {
  onPostCreated?: () => void;
}

export default function PostForm({ onPostCreated }: PostFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof postFormSchema>>({
    resolver: zodResolver(postFormSchema),
    defaultValues: { content: '' },
  });

  const handleFileSelect = (acceptedTypes: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = acceptedTypes;
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      const invalidFiles = files.filter(file => file.size > 20 * 1024 * 1024);
      if (invalidFiles.length > 0) {
        toast({
          title: "Error",
          description: "Files must be less than 20MB",
          variant: "destructive",
        });
        return;
      }
      setMediaFiles(prev => [...prev, ...files]);
    }
  };

  const handleRemoveMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  async function onSubmit(values: z.infer<typeof postFormSchema>) {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('content', values.content);
      formData.append('visibility', 'public');

      mediaFiles.forEach(file => {
        formData.append('mediaAttachments', file);
      });

      const response = await fetch('/api/posts', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        toast({ 
          title: "Success", 
          description: "Your post has been created successfully." 
        });
        form.reset();
        setMediaFiles([]);
        router.refresh();
        onPostCreated?.();  // Call the callback when post is created successfully
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
    <Card className="glass-card shadow-lg">
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="What's on your mind?"
                      className="min-h-[100px] resize-none glass-input focus-ring"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            {mediaFiles.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {mediaFiles.map((file, index) => (
                  <div key={index} className="relative">
                    {file.type.startsWith('image/') ? (
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${index}`}
                        className="rounded-2xl w-full h-32 object-cover"
                      />
                    ) : file.type.startsWith('video/') && (
                      <video
                        src={URL.createObjectURL(file)}
                        className="rounded-2xl w-full h-32 object-cover"
                        controls
                      />
                    )}
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6 rounded-full"
                      onClick={() => handleRemoveMedia(index)}
                    >
                      <span className="sr-only">Remove</span>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between items-center">
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleFileSelect('image/*')}
                  className="glass-button text-black/60 dark:text-white/60"
                >
                  <Image className="mr-2 h-4 w-4" />
                  Photo
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleFileSelect('video/*')}
                  className="glass-button text-black/60 dark:text-white/60"
                >
                  <Video className="mr-2 h-4 w-4" />
                  Video
                </Button>
              </div>
              <Button type="submit" disabled={isSubmitting} className="primary-button">
                {isSubmitting ? 'Posting...' : 'Post'}
              </Button>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
              multiple
              aria-label="Upload media attachments"
            />
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
