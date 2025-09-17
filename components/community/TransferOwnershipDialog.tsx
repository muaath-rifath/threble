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
import { IconCrown, IconAlertTriangle } from '@tabler/icons-react'

interface TransferOwnershipDialogProps {
  communityName: string
  targetMemberName: string
  targetMemberUsername?: string
  onConfirm: () => Promise<void>
  isTransferring?: boolean
  children: React.ReactNode
}

export function TransferOwnershipDialog({ 
  communityName,
  targetMemberName,
  targetMemberUsername,
  onConfirm,
  isTransferring = false,
  children
}: TransferOwnershipDialogProps) {
  const [confirmationText, setConfirmationText] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  
  // The exact text that needs to be typed to confirm transfer
  const requiredText = `transfer ownership`
  const isConfirmationValid = confirmationText === requiredText

  const handleTransfer = async () => {
    if (isConfirmationValid) {
      await onConfirm()
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

  const displayName = targetMemberName || targetMemberUsername || 'this member'

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        {children}
      </AlertDialogTrigger>
      
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
              <IconCrown className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <AlertDialogTitle className="text-left">
                Transfer Ownership
              </AlertDialogTitle>
            </div>
          </div>
          
          <AlertDialogDescription className="text-left space-y-3">
            <p>
              You are about to transfer ownership of <strong>{communityName}</strong> to <strong>{displayName}</strong>.
            </p>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                This action will:
              </p>
              <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1 list-disc list-inside">
                <li>Make {displayName} the new community owner and admin</li>
                <li>Remove your owner privileges</li>
                <li>Change your role to regular member</li>
                <li>This action cannot be undone</li>
                <li>Only the new owner can transfer ownership back</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transfer-confirmation" className="text-sm font-medium">
                To confirm transfer, type: <code className="bg-muted px-1 py-0.5 rounded text-xs">{requiredText}</code>
              </Label>
              <Input
                id="transfer-confirmation"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder={`Type "${requiredText}" to confirm`}
                className="font-mono text-sm"
                autoComplete="off"
              />
            </div>

            {confirmationText && !isConfirmationValid && (
              <p className="text-sm text-destructive">
                Please type the exact text to confirm ownership transfer.
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleTransfer}
            disabled={!isConfirmationValid || isTransferring}
            className="bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500"
          >
            {isTransferring ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Transferring...
              </span>
            ) : (
              'Transfer Ownership'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}