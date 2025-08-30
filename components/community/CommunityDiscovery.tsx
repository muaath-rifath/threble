'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { IconLoader2, IconUsersGroup, IconMessage } from '@tabler/icons-react'
import { useToast } from '@/hooks/use-toast'
import { useInView } from '@intersection-observer/next'
import CommunityCard from './CommunityCard'

interface Community {
    id: string
    name: string
    description: string | null
    image: string | null
    coverImage: string | null
    visibility: 'PUBLIC' | 'PRIVATE'
    creatorId: string
    createdAt: Date
    updatedAt: Date
    creator: {
        id: string
        name: string | null
        username: string | null
        image: string | null
    }
    members: any[]
    _count: {
        members: number
        posts: number
    }
    currentUserMembership: any
}

export default function CommunityDiscovery() {
    const router = useRouter()
    const { toast } = useToast()
    const [communities, setCommunities] = useState<Community[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [cursor, setCursor] = useState<string | null>(null)
    const [hasMore, setHasMore] = useState(true)

    // Intersection observer for infinite scroll
    const { ref, inView } = useInView({
        threshold: 0
    })

    const loadCommunities = async (isLoadMore = false) => {
        if (!isLoadMore) {
            setIsLoading(true)
        } else {
            setIsLoadingMore(true)
        }
        
        try {
            const params = new URLSearchParams({
                limit: '12',
                ...(cursor && isLoadMore && { cursor })
            })
            
            const response = await fetch(`/api/communities?${params}`)
            
            if (response.ok) {
                const data = await response.json()
                const newCommunities = data.communities || []
                
                if (isLoadMore) {
                    setCommunities(prev => [...prev, ...newCommunities])
                } else {
                    setCommunities(newCommunities)
                }
                
                setCursor(data.nextCursor)
                setHasMore(data.hasNextPage)
            } else {
                toast({
                    title: "Error",
                    description: "Failed to load communities",
                    variant: "destructive"
                })
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Something went wrong while loading communities",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
            setIsLoadingMore(false)
        }
    }

    // Load communities on mount
    useEffect(() => {
        loadCommunities(false)
    }, [])

    // Load more when scrolling to bottom
    useEffect(() => {
        if (inView && hasMore && !isLoading && !isLoadingMore) {
            loadCommunities(true)
        }
    }, [inView, hasMore, isLoading, isLoadingMore])

    const handleRefresh = () => {
        setCursor(null)
        setHasMore(true)
        loadCommunities(false)
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[300px]">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <IconLoader2 className="h-5 w-5 animate-spin" />
                    Loading communities...
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <IconUsersGroup className="h-5 w-5" />
                            All Communities
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            Browse and join communities
                        </p>
                    </div>
                    <Button variant="outline" onClick={handleRefresh}>
                        Refresh
                    </Button>
                </CardHeader>
            </Card>

            {/* Communities List */}
            {communities.length > 0 ? (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {communities.map((community) => (
                            <CommunityCard 
                                key={community.id} 
                                community={community}
                                currentUserMembership={community.currentUserMembership}
                                onMembershipChange={() => handleRefresh()}
                            />
                        ))}
                    </div>
                    
                    {/* Infinite scroll trigger */}
                    {hasMore && (
                        <div ref={ref as any} className="py-4">
                            {isLoadingMore && (
                                <div className="flex justify-center">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <IconLoader2 className="h-5 w-5 animate-spin" />
                                        Loading more communities...
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <IconMessage className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Communities Found</h3>
                        <p className="text-muted-foreground text-center mb-4">
                            There are no communities to display at the moment.
                        </p>
                        <Button onClick={() => router.push('/communities/create')}>
                            Create First Community
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
