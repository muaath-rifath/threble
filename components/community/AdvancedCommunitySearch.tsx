'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
    IconSearch, 
    IconFilter, 
    IconUsersGroup, 
    IconTrendingUp, 
    IconStar,
    IconChevronDown,
    IconX
} from '@tabler/icons-react'
import { useToast } from '@/hooks/use-toast'

interface AdvancedSearchProps {
    onCommunitySelect?: (community: any) => void
    showPersonalized?: boolean
}

interface SearchFilters {
    categories: string[]
    memberRange: string
    activityLevel: string
    privacy: string
    sortBy: string
}

interface Community {
    id: string
    name: string
    description: string | null
    imageUrl: string | null
    isPrivate: boolean
    category: string | null
    memberCount: number
    activityLevel: 'low' | 'medium' | 'high'
    createdAt: string
    _count: {
        posts: number
        members: number
    }
}

const CATEGORIES = [
    'Technology', 'Gaming', 'Art & Design', 'Science', 'Health & Fitness',
    'Music', 'Sports', 'Business', 'Education', 'Entertainment', 'Food & Cooking',
    'Travel', 'Fashion', 'Books', 'Photography', 'Politics', 'Other'
]

const MEMBER_RANGES = [
    { label: 'Any size', value: 'any' },
    { label: 'Small (1-50)', value: '1-50' },
    { label: 'Medium (51-200)', value: '51-200' },
    { label: 'Large (201-1000)', value: '201-1000' },
    { label: 'Very Large (1000+)', value: '1000+' }
]

const ACTIVITY_LEVELS = [
    { label: 'Any activity', value: 'any' },
    { label: 'High activity', value: 'high' },
    { label: 'Medium activity', value: 'medium' },
    { label: 'Low activity', value: 'low' }
]

const PRIVACY_OPTIONS = [
    { label: 'All communities', value: 'all' },
    { label: 'Public only', value: 'public' },
    { label: 'Private only', value: 'private' }
]

const SORT_OPTIONS = [
    { label: 'Most relevant', value: 'relevance' },
    { label: 'Most members', value: 'members' },
    { label: 'Most active', value: 'activity' },
    { label: 'Newest', value: 'newest' },
    { label: 'Oldest', value: 'oldest' }
]

export default function AdvancedCommunitySearch({ 
    onCommunitySelect, 
    showPersonalized = true 
}: AdvancedSearchProps) {
    const { toast } = useToast()
    const [searchQuery, setSearchQuery] = useState('')
    const [communities, setCommunities] = useState<Community[]>([])
    const [personalizedCommunities, setPersonalizedCommunities] = useState<Community[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [showFilters, setShowFilters] = useState(false)
    const [activeTab, setActiveTab] = useState<'search' | 'personalized'>('search')
    
    const [filters, setFilters] = useState<SearchFilters>({
        categories: [],
        memberRange: 'any',
        activityLevel: 'any',
        privacy: 'all',
        sortBy: 'relevance'
    })

    const searchCommunities = useCallback(async () => {
        if (!searchQuery.trim()) {
            setCommunities([])
            return
        }

        setIsLoading(true)
        try {
            const params = new URLSearchParams({
                q: searchQuery,
                memberRange: filters.memberRange,
                activityLevel: filters.activityLevel,
                privacy: filters.privacy,
                sortBy: filters.sortBy
            })

            if (filters.categories.length > 0) {
                params.append('categories', filters.categories.join(','))
            }

            const response = await fetch(`/api/communities/advanced-search?${params}`)
            
            if (response.ok) {
                const result = await response.json()
                setCommunities(result.communities || [])
            } else {
                toast({
                    title: "Error",
                    description: "Failed to search communities",
                    variant: "destructive"
                })
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Something went wrong during search",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }, [searchQuery, filters, toast])

    const getPersonalizedRecommendations = useCallback(async () => {
        if (!showPersonalized) return

        setIsLoading(true)
        try {
            const response = await fetch('/api/communities/advanced-search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ getPersonalized: true })
            })
            
            if (response.ok) {
                const result = await response.json()
                setPersonalizedCommunities(result.recommendations || [])
            }
        } catch (error) {
            console.error('Failed to load personalized recommendations:', error)
        } finally {
            setIsLoading(false)
        }
    }, [showPersonalized])

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            if (activeTab === 'search') {
                searchCommunities()
            }
        }, 300)

        return () => clearTimeout(debounceTimer)
    }, [searchQuery, filters, activeTab, searchCommunities])

    useEffect(() => {
        if (activeTab === 'personalized' && personalizedCommunities.length === 0) {
            getPersonalizedRecommendations()
        }
    }, [activeTab, personalizedCommunities.length, getPersonalizedRecommendations])

    const toggleCategory = (category: string) => {
        setFilters(prev => ({
            ...prev,
            categories: prev.categories.includes(category)
                ? prev.categories.filter(c => c !== category)
                : [...prev.categories, category]
        }))
    }

    const clearFilters = () => {
        setFilters({
            categories: [],
            memberRange: 'any',
            activityLevel: 'any',
            privacy: 'all',
            sortBy: 'relevance'
        })
    }

    const getActivityLevelColor = (level: string) => {
        switch (level) {
            case 'high': return 'bg-green-100 text-green-800'
            case 'medium': return 'bg-yellow-100 text-yellow-800'
            case 'low': return 'bg-gray-100 text-gray-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const formatMemberCount = (count: number) => {
        if (count >= 1000) {
            return `${(count / 1000).toFixed(1)}k`
        }
        return count.toString()
    }

    const CommunityCard = ({ community }: { community: Community }) => (
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onCommunitySelect?.(community)}>
            <CardContent className="p-4">
                <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12">
                        <AvatarImage src={community.imageUrl || undefined} />
                        <AvatarFallback>{community.name[0]}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">{community.name}</h3>
                            {community.isPrivate && (
                                <Badge variant="secondary" className="text-xs">Private</Badge>
                            )}
                        </div>
                        
                        {community.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                {community.description}
                            </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <IconUsersGroup className="h-4 w-4" />
                                <span>{formatMemberCount(community.memberCount)} members</span>
                            </div>
                            
                            <div className="flex items-center gap-1">
                                <IconTrendingUp className="h-4 w-4" />
                                <span>{community._count.posts} posts</span>
                            </div>
                            
                            <Badge className={`text-xs ${getActivityLevelColor(community.activityLevel)}`}>
                                {community.activityLevel} activity
                            </Badge>
                        </div>
                        
                        {community.category && (
                            <div className="mt-2">
                                <Badge variant="outline" className="text-xs">
                                    {community.category}
                                </Badge>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <IconSearch className="h-6 w-6" />
                        Discover Communities
                    </h2>
                    <p className="text-muted-foreground">Find communities that match your interests</p>
                </div>
            </div>

            {/* Search and Tabs */}
            {showPersonalized && (
                <div className="flex items-center gap-2 mb-4">
                    <Button
                        variant={activeTab === 'search' ? 'default' : 'outline'}
                        onClick={() => setActiveTab('search')}
                        size="sm"
                    >
                        <IconSearch className="h-4 w-4 mr-2" />
                        Search
                    </Button>
                    <Button
                        variant={activeTab === 'personalized' ? 'default' : 'outline'}
                        onClick={() => setActiveTab('personalized')}
                        size="sm"
                    >
                        <IconStar className="h-4 w-4 mr-2" />
                        For You
                    </Button>
                </div>
            )}

            {activeTab === 'search' && (
                <>
                    {/* Search Bar */}
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <Input
                                placeholder="Search communities by name, description, or category..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-12"
                            />
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => setShowFilters(!showFilters)}
                            className="h-12"
                        >
                            <IconFilter className="h-4 w-4 mr-2" />
                            Filters
                            <IconChevronDown className={`h-4 w-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                        </Button>
                    </div>

                    {/* Filters */}
                    {showFilters && (
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">Search Filters</CardTitle>
                                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                                        Clear All
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Categories */}
                                <div>
                                    <h4 className="font-medium mb-2">Categories</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {CATEGORIES.map((category) => (
                                            <Badge
                                                key={category}
                                                variant={filters.categories.includes(category) ? 'default' : 'outline'}
                                                className="cursor-pointer"
                                                onClick={() => toggleCategory(category)}
                                            >
                                                {category}
                                                {filters.categories.includes(category) && (
                                                    <IconX className="h-3 w-3 ml-1" />
                                                )}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    {/* Member Range */}
                                    <div>
                                        <h4 className="font-medium mb-2">Community Size</h4>
                                        <select
                                            value={filters.memberRange}
                                            onChange={(e) => setFilters(prev => ({ ...prev, memberRange: e.target.value }))}
                                            className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md"
                                        >
                                            {MEMBER_RANGES.map((range) => (
                                                <option key={range.value} value={range.value}>
                                                    {range.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Activity Level */}
                                    <div>
                                        <h4 className="font-medium mb-2">Activity Level</h4>
                                        <select
                                            value={filters.activityLevel}
                                            onChange={(e) => setFilters(prev => ({ ...prev, activityLevel: e.target.value }))}
                                            className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md"
                                        >
                                            {ACTIVITY_LEVELS.map((level) => (
                                                <option key={level.value} value={level.value}>
                                                    {level.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Privacy */}
                                    <div>
                                        <h4 className="font-medium mb-2">Privacy</h4>
                                        <select
                                            value={filters.privacy}
                                            onChange={(e) => setFilters(prev => ({ ...prev, privacy: e.target.value }))}
                                            className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md"
                                        >
                                            {PRIVACY_OPTIONS.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Sort By */}
                                    <div>
                                        <h4 className="font-medium mb-2">Sort By</h4>
                                        <select
                                            value={filters.sortBy}
                                            onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                                            className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md"
                                        >
                                            {SORT_OPTIONS.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}

            {/* Results */}
            <div>
                {isLoading ? (
                    <Card>
                        <CardContent className="p-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                            <p>
                                {activeTab === 'search' ? 'Searching communities...' : 'Loading recommendations...'}
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {activeTab === 'search' && (
                            <>
                                {searchQuery && (
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-medium">
                                            {communities.length} communities found for "{searchQuery}"
                                        </h3>
                                    </div>
                                )}
                                
                                {communities.map((community) => (
                                    <CommunityCard key={community.id} community={community} />
                                ))}
                                
                                {searchQuery && communities.length === 0 && (
                                    <Card>
                                        <CardContent className="p-8 text-center">
                                            <IconSearch className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
                                            <h3 className="font-medium mb-2">No communities found</h3>
                                            <p className="text-muted-foreground">
                                                Try adjusting your search terms or filters
                                            </p>
                                        </CardContent>
                                    </Card>
                                )}
                            </>
                        )}

                        {activeTab === 'personalized' && (
                            <>
                                <h3 className="font-medium flex items-center gap-2">
                                    <IconStar className="h-4 w-4" />
                                    Recommended for you
                                </h3>
                                
                                {personalizedCommunities.map((community) => (
                                    <CommunityCard key={community.id} community={community} />
                                ))}
                                
                                {personalizedCommunities.length === 0 && !isLoading && (
                                    <Card>
                                        <CardContent className="p-8 text-center">
                                            <IconStar className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
                                            <h3 className="font-medium mb-2">No recommendations yet</h3>
                                            <p className="text-muted-foreground">
                                                Join some communities and interact to get personalized recommendations
                                            </p>
                                        </CardContent>
                                    </Card>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
