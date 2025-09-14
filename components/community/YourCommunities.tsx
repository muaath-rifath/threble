'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { IconLoader2, IconUsersGroup, IconMessage, IconSearch, IconSettings, IconCrown, IconShield } from '@tabler/icons-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Community {
    id: string
    name: string
    description: string
    image?: string
    visibility: string
    createdAt: string
    creator: {
        id: string
        name: string
        username: string
        image?: string
    }
    members: Array<{
        id: string
        role: string
        user: {
            id: string
            name: string
            username: string
            image?: string
        }
    }>
    _count: {
        members: number
        posts: number
    }
}

export default function YourCommunities() {
    const { data: session } = useSession()
    const router = useRouter()
    const [communities, setCommunities] = useState<Community[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        if (session?.user) {
            fetchYourCommunities()
        }
    }, [session])

    const fetchYourCommunities = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/communities?myCommunitiesOnly=true&limit=50')
            
            if (!response.ok) {
                throw new Error('Failed to fetch communities')
            }

            const data = await response.json()
            setCommunities(data.communities || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value)
    }

    // Filter communities based on search term
    const filteredCommunities = communities.filter(community =>
        community.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        community.description.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const getUserRole = (community: Community): string => {
        if (!session?.user) return ''
        const membership = community.members.find(member => member.user.id === session.user.id)
        return membership?.role || ''
    }

    const getRoleIcon = (role: string) => {
        switch (role.toLowerCase()) {
            case 'owner':
                return <IconCrown className="h-3 w-3" />
            case 'admin':
                return <IconShield className="h-3 w-3" />
            default:
                return <IconUsersGroup className="h-3 w-3" />
        }
    }

    const getRoleBadgeVariant = (role: string) => {
        switch (role.toLowerCase()) {
            case 'owner':
                return 'default' as const
            case 'admin':
                return 'secondary' as const
            default:
                return 'outline' as const
        }
    }

    const handleCreateCommunity = () => {
        router.push('/communities/create')
    }

    if (!session) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Sign In Required</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Please sign in to view your communities.
                    </p>
                </CardContent>
            </Card>
        )
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <IconLoader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading your communities...</span>
            </div>
        )
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-destructive">Error</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">{error}</p>
                    <Button onClick={fetchYourCommunities} className="mt-4">
                        Try Again
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search your communities..."
                        value={searchTerm}
                        onChange={handleSearchInputChange}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Communities Grid */}
            {filteredCommunities.length === 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle>
                            {searchTerm ? 'No communities found' : 'No communities yet'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">
                            {searchTerm
                                ? `No communities match "${searchTerm}". Try different keywords.`
                                : "You haven't joined any communities yet. Discover and join communities from the other tabs!"
                            }
                        </p>
                        {searchTerm && (
                            <Button onClick={() => setSearchTerm('')} variant="outline">
                                Clear Search
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div>
                    {searchTerm && (
                        <div className="mb-4 flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                                Found {filteredCommunities.length} communities for "{searchTerm}"
                            </p>
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSearchTerm('')}
                            >
                                Clear Search
                            </Button>
                        </div>
                    )}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {filteredCommunities.map((community) => {
                        const userRole = getUserRole(community)
                        
                        return (
                            <Card key={community.id} className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
                                <CardHeader className="pb-3">
                                    <div className="space-y-3">
                                        {/* Profile image and name in one row */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="relative w-10 h-10 rounded-full overflow-hidden bg-muted flex-shrink-0">
                                                    {community.image ? (
                                                        <Image
                                                            src={community.image}
                                                            alt={community.name}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-primary/10">
                                                            <IconUsersGroup className="h-5 w-5 text-primary" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="font-semibold text-lg truncate">{community.name}</h3>
                                                </div>
                                            </div>
                                            {(userRole === 'owner' || userRole === 'admin') && (
                                                <Link href={`/communities/${community.name}/settings`}>
                                                    <Button variant="ghost" size="sm" className="flex-shrink-0">
                                                        <IconSettings className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                            )}
                                        </div>
                                        
                                        {/* Role and visibility badges */}
                                        <div className="flex items-center gap-2">
                                            <Badge variant={getRoleBadgeVariant(userRole)} className="text-xs">
                                                <span className="flex items-center gap-1">
                                                    {getRoleIcon(userRole)}
                                                    {userRole}
                                                </span>
                                            </Badge>
                                            <Badge variant="outline" className="text-xs">
                                                {community.visibility.toLowerCase()}
                                            </Badge>
                                        </div>
                                    </div>
                                </CardHeader>
                                
                                <CardContent className="space-y-4 pt-0">
                                    {/* Description */}
                                    {community.description && (
                                        <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">
                                            {community.description}
                                        </p>
                                    )}
                                    
                                    {/* Enhanced stats section */}
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <IconUsersGroup className="h-4 w-4 text-blue-500" />
                                            <div>
                                                <span className="font-medium text-foreground">{community._count.members}</span>
                                                <span className="text-muted-foreground ml-1">members</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <IconMessage className="h-4 w-4 text-green-500" />
                                            <div>
                                                <span className="font-medium text-foreground">{community._count.posts}</span>
                                                <span className="text-muted-foreground ml-1">posts</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action button */}
                                    <div className="pt-3 border-t border-border/50">
                                        <Link href={`/communities/${community.name}`}>
                                            <Button className="w-full text-sm">
                                                View Community
                                            </Button>
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                    </div>
                </div>
            )}
        </div>
    )
}
