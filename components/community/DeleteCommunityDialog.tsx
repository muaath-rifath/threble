'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { IconTrash, IconAlertTriangle } from '@tabler/icons-react'

interface DeleteCommunityDialogProps {
  communityName: string
  communityId: string
  onDelete: (communityId: string) => Promise<void>
  isDeleting?: boolean
}

export function DeleteCommunityDialog({ 
  communityName, 
  communityId, 
  onDelete, 
  isDeleting = false 
}: DeleteCommunityDialogProps) {
  const [confirmationText, setConfirmationText] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  
  // The exact text that needs to be typed to confirm deletion
  const requiredText = `delete ${communityName}`
  const isConfirmationValid = confirmationText === requiredText

  const handleDelete = async () => {
    if (isConfirmationValid) {
      await onDelete(communityId)
      setIsOpen(false)
      setConfirmationText('')
    }
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setConfirmationText('')
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button 
          variant="destructive" 
          size="sm" 
          className="gap-2"
          disabled={isDeleting}
        >
          <IconTrash className="h-4 w-4" />
          {isDeleting ? 'Deleting...' : 'Delete Community'}
        </Button>
      </AlertDialogTrigger>
      
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <IconAlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <AlertDialogTitle className="text-left">
                Delete Community
              </AlertDialogTitle>
            </div>
          </div>
          
          <AlertDialogDescription className="text-left space-y-3">
            <p>
              You are about to permanently delete <strong>{communityName}</strong>.
            </p>
            
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
              <p className="text-sm font-medium text-destructive mb-2">
                This action will:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Permanently delete the community</li>
                <li>Remove all posts and comments</li>
                <li>Remove all member associations</li>
                <li>Delete all community data and settings</li>
                <li>This action cannot be undone</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmation" className="text-sm font-medium">
                To confirm deletion, type: <code className="bg-muted px-1 py-0.5 rounded text-xs">{requiredText}</code>
              </Label>
              <Input
                id="confirmation"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder={`Type "${requiredText}" to confirm`}
                className="font-mono text-sm"
                autoComplete="off"
              />
            </div>

            {confirmationText && !isConfirmationValid && (
              <p className="text-sm text-destructive">
                Please type the exact text to confirm deletion.
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!isConfirmationValid || isDeleting}
            className="bg-destructive hover:bg-destructive/90 focus:ring-destructive"
          >
            {isDeleting ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Deleting...
              </span>
            ) : (
              'Delete Community'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}