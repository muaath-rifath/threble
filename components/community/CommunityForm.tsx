'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { FileUpload } from '@/components/ui/file-upload'
import { useToast } from '@/hooks/use-toast'
import { createCommunity } from '@/lib/actions/community.actions'
import { IconGlobe, IconLock, IconUpload } from '@tabler/icons-react'

interface CommunityFormProps {
  onSuccess?: (communityName: string) => void
  onCancel?: () => void
}

export default function CommunityForm({ onSuccess, onCancel }: CommunityFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    visibility: 'PUBLIC' as 'PUBLIC' | 'PRIVATE'
  })
  const [errors, setErrors] = useState<{[key: string]: string}>({})

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Community name is required'
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters'
    } else if (formData.name.length > 50) {
      newErrors.name = 'Name must be less than 50 characters'
    }

    if (formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleImageUpload = (files: File[]) => {
    if (files.length > 0) {
      const file = files[0]
      setSelectedImage(file)
      
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const submitFormData = new FormData()
      submitFormData.append('name', formData.name)
      submitFormData.append('description', formData.description)
      submitFormData.append('visibility', formData.visibility)
      
      if (selectedImage) {
        submitFormData.append('image', selectedImage)
      }

      const result = await createCommunity(submitFormData)

      if (result.success && result.community) {
        toast({
          title: "Success",
          description: "Community created successfully!",
        })
        
        if (onSuccess) {
          onSuccess(result.community.name)
        } else {
          router.push(`/communities/${result.community.name}`)
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create community",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create New Community</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Community Image */}
          <div className="space-y-2">
            <Label>Community Image</Label>
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={imagePreview} alt="Community" />
                <AvatarFallback className="bg-muted">
                  {formData.name ? formData.name.charAt(0).toUpperCase() : <IconUpload className="h-6 w-6" />}
                </AvatarFallback>
              </Avatar>
              <FileUpload onChange={handleImageUpload} accept="image/*" maxFiles={1}>
              </FileUpload>
            </div>
          </div>

          {/* Community Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Community Name *</Label>
            <Input
              id="name"
              placeholder="Enter community name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Tell people what this community is about..."
              rows={4}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description}</p>
            )}
          </div>

          {/* Visibility */}
          <div className="space-y-3">
            <Label>Community Visibility</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="public"
                  name="visibility"
                  value="PUBLIC"
                  checked={formData.visibility === 'PUBLIC'}
                  onChange={(e) => handleInputChange('visibility', e.target.value)}
                  className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                />
                <Label htmlFor="public" className="flex items-center space-x-2 cursor-pointer">
                  <IconGlobe className="h-4 w-4" />
                  <div>
                    <div className="font-medium">Public</div>
                    <div className="text-sm text-muted-foreground">Anyone can see and join this community</div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="private"
                  name="visibility"
                  value="PRIVATE"
                  checked={formData.visibility === 'PRIVATE'}
                  onChange={(e) => handleInputChange('visibility', e.target.value)}
                  className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                />
                <Label htmlFor="private" className="flex items-center space-x-2 cursor-pointer">
                  <IconLock className="h-4 w-4" />
                  <div>
                    <div className="font-medium">Private</div>
                    <div className="text-sm text-muted-foreground">Only members can see posts and content</div>
                  </div>
                </Label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Community'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
