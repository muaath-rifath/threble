'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
    IconSettings, 
    IconUsersGroup, 
    IconChartBar, 
    IconShield, 
    IconUserPlus, 
    IconCrown,
    IconAlertTriangle
} from '@tabler/icons-react'
import BulkInviteModal from './BulkInviteModal'
import ModerationDashboard from './ModerationDashboard'
import CommunityAnalytics from './CommunityAnalytics'

interface EnhancedCommunityManagementProps {
    community: {
        id: string
        name: string
        description: string | null
        imageUrl: string | null
        isPrivate: boolean
        category: string | null
        memberCount: number
        postCount: number
        createdAt: string
        creatorId: string
    }
    userRole: 'creator' | 'admin' | 'moderator' | 'member' | null
    userId: string
}

export default function EnhancedCommunityManagement({ 
    community, 
    userRole, 
    userId 
}: EnhancedCommunityManagementProps) {
    const [activeTab, setActiveTab] = useState('overview')
    const [showBulkInvite, setShowBulkInvite] = useState(false)

    const isAdmin = userRole === 'creator' || userRole === 'admin'
    const isModerator = isAdmin || userRole === 'moderator'

    // Only show management features to authorized users
    if (!isModerator) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <IconAlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium mb-2">Access Restricted</h3>
                    <p className="text-muted-foreground">
                        You don't have permission to access community management features.
                    </p>
                </CardContent>
            </Card>
        )
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <IconSettings className="h-6 w-6" />
                        Community Management
                    </h1>
                    <p className="text-muted-foreground">
                        Manage {community.name}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={community.isPrivate ? 'secondary' : 'default'}>
                        {community.isPrivate ? 'Private' : 'Public'}
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                        <IconCrown className="h-3 w-3" />
                        {userRole}
                    </Badge>
                </div>
            </div>

            {/* Community Overview */}
            <Card>
                <CardHeader>
                    <CardTitle>Community Overview</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 border rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">{community.memberCount}</div>
                            <div className="text-sm text-muted-foreground">Members</div>
                        </div>
                        <div className="text-center p-4 border rounded-lg">
                            <div className="text-2xl font-bold text-green-600">{community.postCount}</div>
                            <div className="text-sm text-muted-foreground">Posts</div>
                        </div>
                        <div className="text-center p-4 border rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">
                                {community.category || 'Other'}
                            </div>
                            <div className="text-sm text-muted-foreground">Category</div>
                        </div>
                        <div className="text-center p-4 border rounded-lg">
                            <div className="text-2xl font-bold text-orange-600">
                                {Math.floor((Date.now() - new Date(community.createdAt).getTime()) / (1000 * 60 * 60 * 24))}
                            </div>
                            <div className="text-sm text-muted-foreground">Days Active</div>
                        </div>
                    </div>

                    <div className="mt-4 p-4 bg-muted rounded-lg">
                        <h4 className="font-medium mb-2">Community Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-muted-foreground">Created:</span>
                                <span className="ml-2">{formatDate(community.createdAt)}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Privacy:</span>
                                <span className="ml-2">{community.isPrivate ? 'Private' : 'Public'}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Category:</span>
                                <span className="ml-2">{community.category || 'Not specified'}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Your Role:</span>
                                <span className="ml-2 capitalize">{userRole}</span>
                            </div>
                        </div>
                        {community.description && (
                            <div className="mt-2">
                                <span className="text-muted-foreground">Description:</span>
                                <p className="mt-1 text-sm">{community.description}</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2">
                        {isAdmin && (
                            <Button
                                onClick={() => setShowBulkInvite(true)}
                                className="flex items-center gap-2"
                            >
                                <IconUserPlus className="h-4 w-4" />
                                Bulk Invite Members
                            </Button>
                        )}
                        
                        {isModerator && (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => setActiveTab('moderation')}
                                    className="flex items-center gap-2"
                                >
                                    <IconShield className="h-4 w-4" />
                                    Moderation
                                </Button>
                                
                                <Button
                                    variant="outline"
                                    onClick={() => setActiveTab('analytics')}
                                    className="flex items-center gap-2"
                                >
                                    <IconChartBar className="h-4 w-4" />
                                    Analytics
                                </Button>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Management Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="moderation" disabled={!isModerator}>
                        <IconShield className="h-4 w-4 mr-2" />
                        Moderation
                    </TabsTrigger>
                    <TabsTrigger value="analytics" disabled={!isModerator}>
                        <IconChartBar className="h-4 w-4 mr-2" />
                        Analytics
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Activity Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8 text-muted-foreground">
                                <IconUsersGroup className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>Select Moderation or Analytics to view detailed information</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Community Guidelines */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Management Guidelines</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                                <h4 className="font-medium text-blue-900 mb-2">Best Practices</h4>
                                <ul className="text-sm text-blue-800 space-y-1">
                                    <li>• Regularly review pending join requests and invitations</li>
                                    <li>• Monitor community activity through the analytics dashboard</li>
                                    <li>• Use bulk invitations to grow your community efficiently</li>
                                    <li>• Keep community guidelines up to date and visible</li>
                                </ul>
                            </div>

                            <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
                                <h4 className="font-medium text-green-900 mb-2">Growth Tips</h4>
                                <ul className="text-sm text-green-800 space-y-1">
                                    <li>• Invite active users who align with your community values</li>
                                    <li>• Encourage quality discussions and content sharing</li>
                                    <li>• Recognize and promote valuable community members</li>
                                    <li>• Use analytics to understand peak activity times</li>
                                </ul>
                            </div>

                            <div className="p-4 border border-orange-200 bg-orange-50 rounded-lg">
                                <h4 className="font-medium text-orange-900 mb-2">Moderation Tips</h4>
                                <ul className="text-sm text-orange-800 space-y-1">
                                    <li>• Address issues quickly and fairly</li>
                                    <li>• Use the moderation dashboard to track community health</li>
                                    <li>• Set clear expectations for community behavior</li>
                                    <li>• Regularly review high-activity posts for quality</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="moderation">
                    <ModerationDashboard 
                        communityId={community.id} 
                        communityName={community.name} 
                    />
                </TabsContent>

                <TabsContent value="analytics">
                    <CommunityAnalytics 
                        communityId={community.id} 
                        communityName={community.name} 
                    />
                </TabsContent>
            </Tabs>

            {/* Bulk Invite Modal */}
            {showBulkInvite && (
                <BulkInviteModal
                    communityId={community.id}
                    communityName={community.name}
                    open={showBulkInvite}
                    onClose={() => setShowBulkInvite(false)}
                />
            )}
        </div>
    )
}
