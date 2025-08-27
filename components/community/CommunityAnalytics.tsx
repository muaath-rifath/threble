'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
    BarChart3, 
    TrendingUp, 
    Users, 
    MessageSquare, 
    Calendar,
    RefreshCw,
    Activity,
    Globe,
    Clock
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface CommunityAnalyticsProps {
    communityId: string
    communityName: string
}

interface AnalyticsData {
    memberGrowth: Array<{
        date: string
        count: number
    }>
    postActivity: Array<{
        date: string
        count: number
    }>
    engagement: {
        totalPosts: number
        totalReactions: number
        totalReplies: number
        avgReactionsPerPost: number
        avgRepliesPerPost: number
        topContributors: Array<{
            user: {
                id: string
                name: string | null
                username: string | null
                image: string | null
            }
            postCount: number
            reactionCount: number
        }>
    }
    retention: {
        newMembersThisPeriod: number
        activeMembersThisPeriod: number
        retentionRate: number
    }
    demographics: {
        totalMembers: number
        activeMembers: number
        newMembersToday: number
        newMembersThisWeek: number
    }
}

const SimpleLineChart = ({ data, title, color = "#3b82f6" }: { 
    data: Array<{ date: string; count: number }>, 
    title: string,
    color?: string 
}) => {
    if (!data || data.length === 0) {
        return (
            <div className="h-48 flex items-center justify-center text-muted-foreground">
                No data available
            </div>
        )
    }

    const maxValue = Math.max(...data.map(d => d.count))
    const minValue = Math.min(...data.map(d => d.count))
    const range = maxValue - minValue || 1

    return (
        <div className="space-y-2">
            <h3 className="text-sm font-medium">{title}</h3>
            <div className="relative h-32 w-full">
                <svg className="w-full h-full" viewBox="0 0 400 120">
                    {/* Grid lines */}
                    {[...Array(5)].map((_, i) => (
                        <line
                            key={i}
                            x1="0"
                            y1={20 + (i * 20)}
                            x2="400"
                            y2={20 + (i * 20)}
                            stroke="#f1f5f9"
                            strokeWidth="1"
                        />
                    ))}
                    
                    {/* Data line */}
                    <polyline
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                        points={data.map((d, i) => {
                            const x = (i / (data.length - 1)) * 380 + 10
                            const y = 100 - ((d.count - minValue) / range) * 80 + 10
                            return `${x},${y}`
                        }).join(' ')}
                    />
                    
                    {/* Data points */}
                    {data.map((d, i) => {
                        const x = (i / (data.length - 1)) * 380 + 10
                        const y = 100 - ((d.count - minValue) / range) * 80 + 10
                        return (
                            <circle
                                key={i}
                                cx={x}
                                cy={y}
                                r="3"
                                fill={color}
                            />
                        )
                    })}
                </svg>
                
                {/* Value labels */}
                <div className="absolute top-0 left-0 w-full h-full flex items-end justify-between px-2 pb-2">
                    {data.map((d, i) => (
                        <div key={i} className="text-xs text-center">
                            <div className="font-medium">{d.count}</div>
                            <div className="text-muted-foreground">
                                {new Date(d.date).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric' 
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default function CommunityAnalytics({ 
    communityId, 
    communityName 
}: CommunityAnalyticsProps) {
    const { toast } = useToast()
    const [data, setData] = useState<AnalyticsData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [period, setPeriod] = useState('30d')

    const loadAnalytics = async () => {
        setIsLoading(true)
        try {
            const response = await fetch(
                `/api/communities/${communityId}/analytics?period=${period}`
            )
            
            if (response.ok) {
                const result = await response.json()
                setData(result)
            } else {
                toast({
                    title: "Error",
                    description: "Failed to load analytics data",
                    variant: "destructive"
                })
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Something went wrong loading analytics data",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadAnalytics()
    }, [period])

    if (isLoading && !data) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p>Loading analytics...</p>
                </CardContent>
            </Card>
        )
    }

    if (!data) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
                    <p>Failed to load analytics data</p>
                    <Button onClick={loadAnalytics} className="mt-4">
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
                        <BarChart3 className="h-6 w-6" />
                        Community Analytics
                    </h1>
                    <p className="text-muted-foreground">
                        {communityName} insights and metrics
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <select 
                        value={period} 
                        onChange={(e) => setPeriod(e.target.value)}
                        className="border border-input bg-background px-3 py-2 text-sm rounded-md"
                    >
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                        <option value="90d">Last 90 days</option>
                        <option value="all">All time</option>
                    </select>
                    <Button onClick={loadAnalytics} variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Members</p>
                                <p className="text-2xl font-bold">{data.demographics.totalMembers}</p>
                                <p className="text-sm text-green-600">+{data.demographics.newMembersThisWeek} this week</p>
                            </div>
                            <Users className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Active Members</p>
                                <p className="text-2xl font-bold">{data.demographics.activeMembers}</p>
                                <p className="text-sm text-muted-foreground">
                                    {Math.round((data.demographics.activeMembers / data.demographics.totalMembers) * 100)}% of total
                                </p>
                            </div>
                            <Activity className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Posts</p>
                                <p className="text-2xl font-bold">{data.engagement.totalPosts}</p>
                                <p className="text-sm text-muted-foreground">
                                    {data.engagement.avgReactionsPerPost.toFixed(1)} avg reactions
                                </p>
                            </div>
                            <MessageSquare className="h-8 w-8 text-purple-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Retention Rate</p>
                                <p className="text-2xl font-bold">{data.retention.retentionRate.toFixed(1)}%</p>
                                <p className="text-sm text-muted-foreground">
                                    {data.retention.activeMembersThisPeriod} active
                                </p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-orange-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Analytics */}
            <Tabs defaultValue="growth" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="growth">Growth</TabsTrigger>
                    <TabsTrigger value="engagement">Engagement</TabsTrigger>
                    <TabsTrigger value="contributors">Contributors</TabsTrigger>
                    <TabsTrigger value="insights">Insights</TabsTrigger>
                </TabsList>

                <TabsContent value="growth" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Member Growth</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <SimpleLineChart 
                                    data={data.memberGrowth} 
                                    title="New members over time"
                                    color="#3b82f6"
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Post Activity</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <SimpleLineChart 
                                    data={data.postActivity} 
                                    title="Posts created over time"
                                    color="#10b981"
                                />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="engagement" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Total Engagement</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm">Total Reactions</span>
                                    <span className="font-bold">{data.engagement.totalReactions}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm">Total Replies</span>
                                    <span className="font-bold">{data.engagement.totalReplies}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm">Avg Reactions/Post</span>
                                    <span className="font-bold">{data.engagement.avgReactionsPerPost.toFixed(1)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm">Avg Replies/Post</span>
                                    <span className="font-bold">{data.engagement.avgRepliesPerPost.toFixed(1)}</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="md:col-span-2">
                            <CardHeader>
                                <CardTitle>Engagement Breakdown</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span>Reactions</span>
                                            <span>{data.engagement.totalReactions}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div 
                                                className="bg-blue-600 h-2 rounded-full" 
                                                style={{
                                                    width: `${(data.engagement.totalReactions / (data.engagement.totalReactions + data.engagement.totalReplies)) * 100}%`
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span>Replies</span>
                                            <span>{data.engagement.totalReplies}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div 
                                                className="bg-green-600 h-2 rounded-full" 
                                                style={{
                                                    width: `${(data.engagement.totalReplies / (data.engagement.totalReactions + data.engagement.totalReplies)) * 100}%`
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="contributors" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Top Contributors</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {data.engagement.topContributors.length > 0 ? (
                                <div className="space-y-4">
                                    {data.engagement.topContributors.map((contributor, index) => (
                                        <div key={contributor.user.id} className="flex items-center justify-between p-3 border rounded-md">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm">
                                                    {index + 1}
                                                </div>
                                                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                                    {contributor.user.image ? (
                                                        <img 
                                                            src={contributor.user.image} 
                                                            alt={contributor.user.name || contributor.user.username || ''} 
                                                            className="w-full h-full rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <span className="text-sm font-medium">
                                                            {(contributor.user.name || contributor.user.username || '?')[0]}
                                                        </span>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-medium">
                                                        {contributor.user.name || contributor.user.username || 'Unknown'}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {contributor.postCount} posts • {contributor.reactionCount} reactions received
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-center py-8">No contributor data available</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="insights" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Community Health</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">Member Retention</span>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${
                                            data.retention.retentionRate >= 70 ? 'bg-green-500' : 
                                            data.retention.retentionRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                        }`}></div>
                                        <span className="font-medium">{data.retention.retentionRate.toFixed(1)}%</span>
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">Activity Level</span>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${
                                            data.engagement.avgReactionsPerPost >= 3 ? 'bg-green-500' : 
                                            data.engagement.avgReactionsPerPost >= 1 ? 'bg-yellow-500' : 'bg-red-500'
                                        }`}></div>
                                        <span className="font-medium">
                                            {data.engagement.avgReactionsPerPost >= 3 ? 'High' : 
                                             data.engagement.avgReactionsPerPost >= 1 ? 'Medium' : 'Low'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm">Growth Trend</span>
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-green-500" />
                                        <span className="font-medium text-green-600">Growing</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Quick Stats</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold">{data.demographics.newMembersToday}</div>
                                    <div className="text-sm text-muted-foreground">New members today</div>
                                </div>
                                
                                <div className="text-center">
                                    <div className="text-2xl font-bold">
                                        {Math.round((data.demographics.activeMembers / data.demographics.totalMembers) * 100)}%
                                    </div>
                                    <div className="text-sm text-muted-foreground">Member activity rate</div>
                                </div>

                                <div className="text-center">
                                    <div className="text-2xl font-bold">
                                        {data.engagement.totalPosts > 0 ? 
                                         Math.round(data.engagement.totalReactions / data.engagement.totalPosts) : 0}
                                    </div>
                                    <div className="text-sm text-muted-foreground">Engagement score</div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
