'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
    IconSearch, 
    IconSettings, 
    IconUsersGroup, 
    IconTrendingUp,
    IconPlus
} from '@tabler/icons-react'
import AdvancedCommunitySearch from './AdvancedCommunitySearch'
import EnhancedCommunityManagement from './EnhancedCommunityManagement'

interface CommunityHubProps {
    user: {
        id: string
        name: string | null
        username: string | null
        image: string | null
    }
    userCommunities?: Array<{
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
        userRole: 'creator' | 'admin' | 'moderator' | 'member'
    }>
}

export default function CommunityHub({ user, userCommunities = [] }: CommunityHubProps) {
    const [activeTab, setActiveTab] = useState('discover')
    const [selectedCommunity, setSelectedCommunity] = useState<any>(null)

    const handleCommunitySelect = (community: any) => {
        setSelectedCommunity(community)
        setActiveTab('manage')
    }

    const managedCommunities = userCommunities.filter(
        community => ['creator', 'admin', 'moderator'].includes(community.userRole)
    )

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Community Hub</h1>
                    <p className="text-muted-foreground">
                        Discover, manage, and grow your communities
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline">
                        <IconPlus className="h-4 w-4 mr-2" />
                        Create Community
                    </Button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">My Communities</p>
                                <p className="text-2xl font-bold">{userCommunities.length}</p>
                            </div>
                            <IconUsersGroup className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Managing</p>
                                <p className="text-2xl font-bold">{managedCommunities.length}</p>
                            </div>
                            <IconSettings className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Members</p>
                                <p className="text-2xl font-bold">
                                    {userCommunities.reduce((sum, community) => sum + community.memberCount, 0)}
                                </p>
                            </div>
                            <IconTrendingUp className="h-8 w-8 text-purple-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Interface */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="discover">
                        <IconSearch className="h-4 w-4 mr-2" />
                        Discover
                    </TabsTrigger>
                    <TabsTrigger value="my-communities">
                        <IconUsersGroup className="h-4 w-4 mr-2" />
                        My Communities
                    </TabsTrigger>
                    <TabsTrigger value="manage" disabled={!selectedCommunity && managedCommunities.length === 0}>
                        <IconSettings className="h-4 w-4 mr-2" />
                        Manage
                    </TabsTrigger>
                    <TabsTrigger value="analytics" disabled={managedCommunities.length === 0}>
                        <IconTrendingUp className="h-4 w-4 mr-2" />
                        Analytics
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="discover" className="space-y-6">
                    <AdvancedCommunitySearch 
                        onCommunitySelect={handleCommunitySelect}
                        showPersonalized={true}
                    />
                </TabsContent>

                <TabsContent value="my-communities" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {userCommunities.map((community) => (
                            <Card key={community.id} className="cursor-pointer hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="font-semibold text-lg line-clamp-1">{community.name}</h3>
                                        <span className={`px-2 py-1 text-xs rounded-full ${
                                            community.userRole === 'creator' ? 'bg-gold-100 text-gold-800' :
                                            community.userRole === 'admin' ? 'bg-purple-100 text-purple-800' :
                                            community.userRole === 'moderator' ? 'bg-blue-100 text-blue-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {community.userRole}
                                        </span>
                                    </div>
                                    
                                    {community.description && (
                                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                            {community.description}
                                        </p>
                                    )}
                                    
                                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                                        <span>{community.memberCount} members</span>
                                        <span>{community.postCount} posts</span>
                                    </div>

                                    {['creator', 'admin', 'moderator'].includes(community.userRole) && (
                                        <Button 
                                            size="sm" 
                                            className="w-full mt-3"
                                            onClick={() => handleCommunitySelect(community)}
                                        >
                                            <IconSettings className="h-4 w-4 mr-2" />
                                            Manage
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                        
                        {userCommunities.length === 0 && (
                            <Card className="col-span-full">
                                <CardContent className="p-8 text-center">
                                    <IconUsersGroup className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                    <h3 className="font-medium mb-2">No communities yet</h3>
                                    <p className="text-muted-foreground mb-4">
                                        Join some communities to get started, or create your own!
                                    </p>
                                    <Button onClick={() => setActiveTab('discover')}>
                                        <IconSearch className="h-4 w-4 mr-2" />
                                        Discover Communities
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="manage" className="space-y-6">
                    {selectedCommunity ? (
                        <div>
                            <div className="flex items-center gap-4 mb-6">
                                <Button 
                                    variant="outline" 
                                    onClick={() => setSelectedCommunity(null)}
                                >
                                    ← Back to Communities
                                </Button>
                                <h2 className="text-xl font-semibold">
                                    Managing: {selectedCommunity.name}
                                </h2>
                            </div>
                            <EnhancedCommunityManagement
                                community={selectedCommunity}
                                userRole={selectedCommunity.userRole || 'member'}
                                userId={user.id}
                            />
                        </div>
                    ) : managedCommunities.length > 0 ? (
                        <div>
                            <h2 className="text-xl font-semibold mb-4">Select a Community to Manage</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {managedCommunities.map((community) => (
                                    <Card key={community.id} className="cursor-pointer hover:shadow-md transition-shadow">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="font-medium">{community.name}</h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        {community.memberCount} members • {community.userRole}
                                                    </p>
                                                </div>
                                                <Button 
                                                    size="sm"
                                                    onClick={() => handleCommunitySelect(community)}
                                                >
                                                    <IconSettings className="h-4 w-4 mr-2" />
                                                    Manage
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="p-8 text-center">
                                <IconSettings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="font-medium mb-2">No communities to manage</h3>
                                <p className="text-muted-foreground">
                                    You need to be a creator, admin, or moderator to manage communities.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="analytics" className="space-y-6">
                    <Card>
                        <CardContent className="p-8 text-center">
                            <IconTrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="font-medium mb-2">Cross-Community Analytics</h3>
                            <p className="text-muted-foreground">
                                Compare performance across all your managed communities. Coming soon!
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
