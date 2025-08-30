'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
    IconShield, 
    IconUsersGroup, 
    IconMessage, 
    IconTrendingUp, 
    IconAlertTriangle, 
    IconClock, 
    IconTrash,
    IconRefresh
} from '@tabler/icons-react'
import { useToast } from '@/hooks/use-toast'

interface ModerationDashboardProps {
    communityId: string
    communityName: string
}

interface ModerationData {
    period: string
    stats: {
        members: { new: number; growth: string | null }
        posts: { new: number; growth: string | null }
        pendingRequests: number
        pendingInvitations: number
    }
    recentActivity: any[]
    pendingRequests: any[]
    pendingInvitations: any[]
    highActivityPosts: any[]
    activeMembers: any[]
}

export default function ModerationDashboard({ 
    communityId, 
    communityName 
}: ModerationDashboardProps) {
    const { toast } = useToast()
    const [data, setData] = useState<ModerationData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('overview')
    const [period, setPeriod] = useState('7d')

    const loadData = async () => {
        setIsLoading(true)
        try {
            const response = await fetch(
                `/api/communities/${communityId}/moderation?period=${period}`
            )
            
            if (response.ok) {
                const result = await response.json()
                setData(result)
            } else {
                toast({
                    title: "Error",
                    description: "Failed to load moderation data",
                    variant: "destructive"
                })
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Something went wrong loading moderation data",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [period])

    const performModerationAction = async (action: string, targetType: string, targetId: string, reason?: string) => {
        try {
            const response = await fetch(`/api/communities/${communityId}/moderation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, targetType, targetId, reason })
            })

            if (response.ok) {
                toast({
                    title: "Action completed",
                    description: `Successfully performed ${action}`,
                })
                loadData() // Refresh data
            } else {
                const error = await response.json()
                toast({
                    title: "Error",
                    description: error.error || "Failed to perform action",
                    variant: "destructive"
                })
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Something went wrong",
                variant: "destructive"
            })
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString()
    }

    const formatGrowth = (growth: string | null) => {
        if (!growth) return null
        const num = parseFloat(growth)
        return (
            <span className={`text-sm ${num >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {num >= 0 ? '+' : ''}{growth}%
            </span>
        )
    }

    if (isLoading && !data) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p>Loading moderation dashboard...</p>
                </CardContent>
            </Card>
        )
    }

    if (!data) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <IconAlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
                    <p>Failed to load moderation data</p>
                    <Button onClick={loadData} className="mt-4">
                        Try Again
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <IconShield className="h-6 w-6" />
                        Moderation Dashboard
                    </h1>
                    <p className="text-muted-foreground">
                        Manage {communityName} community
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <select 
                        value={period} 
                        onChange={(e) => setPeriod(e.target.value)}
                        className="border border-input bg-background px-3 py-2 text-sm rounded-md"
                    >
                        <option value="24h">Last 24 hours</option>
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                        <option value="all">All time</option>
                    </select>
                    <Button onClick={loadData} variant="outline" size="sm">
                        <IconRefresh className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">New Members</p>
                                <p className="text-2xl font-bold">{data.stats.members.new}</p>
                                {formatGrowth(data.stats.members.growth)}
                            </div>
                            <IconUsersGroup className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">New Posts</p>
                                <p className="text-2xl font-bold">{data.stats.posts.new}</p>
                                {formatGrowth(data.stats.posts.growth)}
                            </div>
                            <IconMessage className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Join Requests</p>
                                <p className="text-2xl font-bold">{data.stats.pendingRequests}</p>
                                <p className="text-sm text-muted-foreground">Pending</p>
                            </div>
                            <IconClock className="h-8 w-8 text-yellow-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Invitations</p>
                                <p className="text-2xl font-bold">{data.stats.pendingInvitations}</p>
                                <p className="text-sm text-muted-foreground">Pending</p>
                            </div>
                            <IconTrendingUp className="h-8 w-8 text-purple-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="requests">Join Requests</TabsTrigger>
                    <TabsTrigger value="content">Content</TabsTrigger>
                    <TabsTrigger value="members">Members</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    {/* Recent Activity */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Activity</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {data.recentActivity.length > 0 ? (
                                <div className="space-y-4">
                                    {data.recentActivity.slice(0, 5).map((post) => (
                                        <div key={post.id} className="flex items-start gap-3 p-3 border rounded-md">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={post.author.image} />
                                                <AvatarFallback>
                                                    {post.author.name?.[0] || post.author.username?.[0]}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="font-medium">{post.author.name || post.author.username}</span>
                                                    <span className="text-muted-foreground">posted</span>
                                                    <span className="text-muted-foreground">{formatDate(post.createdAt)}</span>
                                                </div>
                                                <p className="text-sm mt-1 line-clamp-2">{post.content}</p>
                                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                                    <span>{post._count.reactions} reactions</span>
                                                    <span>{post._count.replies} replies</span>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => performModerationAction('delete_post', 'post', post.id)}
                                            >
                                                <IconTrash className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-center py-4">No recent activity</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Top Contributors */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Most Active Members</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {data.activeMembers.length > 0 ? (
                                <div className="space-y-3">
                                    {data.activeMembers.slice(0, 5).map((member, index) => (
                                        <div key={member.user?.id} className="flex items-center justify-between p-2 border rounded-md">
                                            <div className="flex items-center gap-3">
                                                <div className="text-sm font-medium w-6">{index + 1}</div>
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={member.user?.image} />
                                                    <AvatarFallback>
                                                        {member.user?.name?.[0] || member.user?.username?.[0]}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-medium text-sm">{member.user?.name || member.user?.username}</div>
                                                </div>
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {member.postCount} posts
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-center py-4">No active members</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="requests" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Pending Join Requests</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {data.pendingRequests.length > 0 ? (
                                <div className="space-y-4">
                                    {data.pendingRequests.map((request) => (
                                        <div key={request.id} className="flex items-center justify-between p-4 border rounded-md">
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarImage src={request.user.image} />
                                                    <AvatarFallback>
                                                        {request.user.name?.[0] || request.user.username?.[0]}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-medium">{request.user.name || request.user.username}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        Requested {formatDate(request.createdAt)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="outline">
                                                    Accept
                                                </Button>
                                                <Button size="sm" variant="outline">
                                                    Reject
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-center py-8">No pending requests</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="content" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>High Activity Posts</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {data.highActivityPosts.length > 0 ? (
                                <div className="space-y-4">
                                    {data.highActivityPosts.map((post) => (
                                        <div key={post.id} className="flex items-start justify-between p-4 border rounded-md">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Avatar className="h-6 w-6">
                                                        <AvatarImage src={post.author.image} />
                                                        <AvatarFallback>
                                                            {post.author.name?.[0] || post.author.username?.[0]}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="font-medium text-sm">{post.author.name || post.author.username}</span>
                                                    <Badge variant="secondary" className="text-xs">
                                                        {post._count.reactions} reactions, {post._count.replies} replies
                                                    </Badge>
                                                </div>
                                                <p className="text-sm line-clamp-2">{post.content}</p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => performModerationAction('delete_post', 'post', post.id)}
                                            >
                                                <IconTrash className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-center py-8">No high activity posts</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="members" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Member Management</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground text-center py-8">
                                Member management features coming soon...
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
