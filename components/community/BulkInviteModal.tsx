'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { IconX, IconSend, IconLoader2, IconCircleCheck, IconAlertCircle } from '@tabler/icons-react'
import { useToast } from '@/hooks/use-toast'

interface BulkInviteModalProps {
    communityId: string
    communityName: string
    open?: boolean
    onInvitesSent?: (results: any) => void
    onClose?: () => void
}

export default function BulkInviteModal({ 
    communityId, 
    communityName, 
    open = false,
    onInvitesSent,
    onClose
}: BulkInviteModalProps) {
    const { toast } = useToast()
    const [isOpen, setIsOpen] = useState(open)
    const [usernames, setUsernames] = useState<string[]>([])
    const [currentUsername, setCurrentUsername] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [results, setResults] = useState<any>(null)

    // Update internal state when prop changes
    useEffect(() => {
        setIsOpen(open)
    }, [open])

    const addUsername = (username: string) => {
        const trimmed = username.trim()
        if (trimmed && !usernames.includes(trimmed)) {
            setUsernames([...usernames, trimmed])
            setCurrentUsername('')
        }
    }

    const removeUsername = (username: string) => {
        setUsernames(usernames.filter(u => u !== username))
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && currentUsername.trim()) {
            e.preventDefault()
            addUsername(currentUsername)
        }
    }

    const handleBulkAdd = (text: string) => {
        const newUsernames = text
            .split(/[\s,\n]+/)
            .map(u => u.trim())
            .filter(u => u && !usernames.includes(u))
        
        if (usernames.length + newUsernames.length > 50) {
            toast({
                title: "Too many users",
                description: "You can only invite up to 50 users at once",
                variant: "destructive"
            })
            return
        }

        setUsernames([...usernames, ...newUsernames])
    }

    const sendInvitations = async () => {
        if (usernames.length === 0) {
            toast({
                title: "No users selected",
                description: "Please add at least one username",
                variant: "destructive"
            })
            return
        }

        setIsLoading(true)
        try {
            const response = await fetch(`/api/communities/invitations/bulk?communityId=${communityId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    usernames
                })
            })

            const data = await response.json()

            if (data.success) {
                setResults(data.results)
                onInvitesSent?.(data.results)
                
                toast({
                    title: "Invitations sent",
                    description: `Successfully sent ${data.results.invited} invitations`,
                })
            } else {
                toast({
                    title: "Error",
                    description: data.error || "Failed to send invitations",
                    variant: "destructive"
                })
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Something went wrong while sending invitations",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleClose = () => {
        setIsOpen(false)
        setUsernames([])
        setCurrentUsername('')
        setResults(null)
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open)
            if (!open) {
                handleClose()
            }
        }}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        Invite Users to {communityName}
                    </DialogTitle>
                </DialogHeader>

                {!results ? (
                    <div className="space-y-6">
                        {/* Username Input */}
                        <div className="space-y-2">
                            <Label htmlFor="username">Add Users</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="username"
                                    placeholder="Enter username and press Enter"
                                    value={currentUsername}
                                    onChange={(e) => setCurrentUsername(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    disabled={isLoading}
                                />
                                <Button
                                    onClick={() => addUsername(currentUsername)}
                                    disabled={!currentUsername.trim() || isLoading}
                                    variant="outline"
                                >
                                    Add
                                </Button>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                You can also paste multiple usernames separated by commas or new lines
                            </p>
                        </div>

                        {/* Bulk Add */}
                        <div className="space-y-2">
                            <Label htmlFor="bulk-usernames">Or Add Multiple at Once</Label>
                            <Textarea
                                id="bulk-usernames"
                                placeholder="user1, user2, user3..."
                                className="min-h-[100px]"
                                onBlur={(e) => {
                                    if (e.target.value.trim()) {
                                        handleBulkAdd(e.target.value)
                                        e.target.value = ''
                                    }
                                }}
                                disabled={isLoading}
                            />
                        </div>

                        {/* Selected Usernames */}
                        {usernames.length > 0 && (
                            <div className="space-y-2">
                                <Label>Selected Users ({usernames.length}/50)</Label>
                                <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-md max-h-32 overflow-y-auto">
                                    {usernames.map((username) => (
                                        <Badge
                                            key={username}
                                            variant="secondary"
                                            className="flex items-center gap-1"
                                        >
                                            {username}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-auto p-0 hover:bg-transparent"
                                                onClick={() => removeUsername(username)}
                                            >
                                                <IconX className="h-3 w-3" />
                                            </Button>
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Send Button */}
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={handleClose}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={sendInvitations}
                                disabled={usernames.length === 0 || isLoading}
                                className="flex items-center gap-2"
                            >
                                {isLoading ? (
                                    <IconLoader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <IconSend className="h-4 w-4" />
                                )}
                                Send {usernames.length} Invitations
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="text-center">
                            <IconCircleCheck className="h-12 w-12 text-green-500 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold">Invitations Sent</h3>
                            <p className="text-muted-foreground">
                                Here are the results of your bulk invitation:
                            </p>
                        </div>

                        {/* Results Summary */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                                <div className="text-2xl font-bold text-green-600">{results.invited}</div>
                                <div className="text-sm text-muted-foreground">Invited</div>
                            </div>
                            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                                <div className="text-2xl font-bold text-blue-600">{results.alreadyMembers?.length || 0}</div>
                                <div className="text-sm text-muted-foreground">Already Members</div>
                            </div>
                            <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                                <div className="text-2xl font-bold text-yellow-600">{results.alreadyInvited?.length || 0}</div>
                                <div className="text-sm text-muted-foreground">Already Invited</div>
                            </div>
                            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
                                <div className="text-2xl font-bold text-red-600">{results.notFound?.length || 0}</div>
                                <div className="text-sm text-muted-foreground">Not Found</div>
                            </div>
                        </div>

                        {/* Detailed Results */}
                        {(results.alreadyMembers?.length > 0 || results.alreadyInvited?.length > 0 || results.notFound?.length > 0) && (
                            <div className="space-y-4">
                                {results.alreadyMembers?.length > 0 && (
                                    <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-2">
                                                <IconAlertCircle className="h-4 w-4 text-blue-600" />
                                                <div>
                                                    <strong>Already members:</strong> {results.alreadyMembers.join(', ')}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {results.alreadyInvited?.length > 0 && (
                                    <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-2">
                                                <IconAlertCircle className="h-4 w-4 text-yellow-600" />
                                                <div>
                                                    <strong>Already invited:</strong> {results.alreadyInvited.join(', ')}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {results.notFound?.length > 0 && (
                                    <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-2">
                                                <IconAlertCircle className="h-4 w-4 text-red-600" />
                                                <div>
                                                    <strong>Users not found:</strong> {results.notFound.join(', ')}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end">
                            <Button onClick={handleClose}>
                                Done
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
