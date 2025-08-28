'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Search, Users, MessageSquare, Filter, Loader2 } from 'lucide-react'
import { searchCommunities } from '@/lib/actions/community.actions'
import { useToast } from '@/hooks/use-toast'
import { useInView } from '@intersection-observer/next'
import CommunityCard from './CommunityCard'

interface SearchResult {
    id: string
    name: string
    description: string | null
    image: string | null
    visibility: 'PUBLIC' | 'PRIVATE'
    creator: {
        id: string
        name: string | null
        username: string | null
        image: string | null
    }
    _count: {
        members: number
        posts: number
    }
    currentUserMembership: any
    // Add additional fields as needed by CommunityCard
    [key: string]: any
}

interface CommunitySearchProps {
    initialQuery?: string
}

export default function CommunitySearch({ initialQuery = '' }: CommunitySearchProps) {
    const router = useRouter()
    const { toast } = useToast()
    const [query, setQuery] = useState(initialQuery)
    const [sort, setSort] = useState('relevant')
    const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE' | 'all'>('all')
    const [results, setResults] = useState<SearchResult[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [totalCount, setTotalCount] = useState(0)
    const [currentPage, setCurrentPage] = useState(1)
    const [hasMore, setHasMore] = useState(false)
    
    // Use ref to prevent infinite loops with latest values
    const searchParamsRef = useRef({ query, sort, visibility })
    searchParamsRef.current = { query, sort, visibility }

    // Intersection observer for infinite scroll
    const { ref, inView } = useInView({
        threshold: 0
    })

    const limit = 12

    const performSearch = useCallback(async (searchQuery: string, page: number = 1) => {
        if (page === 1) {
            setIsLoading(true)
        } else {
            setIsLoadingMore(true)
        }
        
        try {
            const offset = (page - 1) * limit
            const { sort: currentSort, visibility: currentVisibility } = searchParamsRef.current
            const searchParams = {
                query: searchQuery.trim(),
                sort: currentSort as 'relevant' | 'popular' | 'recent' | 'name',
                visibility: currentVisibility === 'all' ? undefined : currentVisibility as 'PUBLIC' | 'PRIVATE',
                limit,
                offset
            }

            const result = await searchCommunities(searchParams)
            
            if (result.success) {
                if (page === 1) {
                    setResults(result.communities)
                } else {
                    setResults(prev => [...prev, ...result.communities])
                }
                setTotalCount(result.totalCount)
                setHasMore(result.hasMore || false)
            } else {
                toast({
                    title: "Search Error",
                    description: result.error || "Search failed",
                    variant: "destructive"
                })
            }
        } catch (error) {
            toast({
                title: "Search Error",
                description: "Failed to search communities",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
            setIsLoadingMore(false)
        }
    }, [toast]) // Only depend on toast which is stable

    // Search when query, sort, or visibility changes
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.trim() || sort !== 'relevant' || visibility !== 'all') {
                setCurrentPage(1)
                performSearch(query, 1)
            } else {
                setResults([])
                setTotalCount(0)
                setHasMore(false)
            }
        }, 500)

        return () => clearTimeout(timer)
    }, [query, sort, visibility]) // Remove performSearch from dependencies

    // Load more when scrolling to bottom
    useEffect(() => {
        if (inView && hasMore && !isLoading && !isLoadingMore) {
            const nextPage = currentPage + 1
            setCurrentPage(nextPage)
            performSearch(query, nextPage)
        }
    }, [inView, hasMore, isLoading, isLoadingMore, currentPage, query, performSearch])

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setCurrentPage(1)
        performSearch(query, 1)
    }

    return (
        <div className="space-y-6">
            {/* Search Header */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Search className="h-5 w-5" />
                        Search Communities
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <form onSubmit={handleSearchSubmit} className="flex gap-2">
                        <div className="flex-1">
                            <Input
                                type="text"
                                placeholder="Search communities by name or description..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="w-full"
                            />
                        </div>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Search className="h-4 w-4" />
                            )}
                        </Button>
                    </form>

                    {/* Filters */}
                    <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            <span className="text-sm font-medium">Sort by:</span>
                            <select 
                                value={sort} 
                                onChange={(e) => setSort(e.target.value)}
                                className="border border-input bg-background px-3 py-2 text-sm rounded-md"
                            >
                                <option value="relevant">Relevant</option>
                                <option value="popular">Popular</option>
                                <option value="recent">Recent</option>
                                <option value="name">Name</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Privacy:</span>
                            <select 
                                value={visibility} 
                                onChange={(e) => setVisibility(e.target.value as 'PUBLIC' | 'PRIVATE' | 'all')}
                                className="border border-input bg-background px-3 py-2 text-sm rounded-md"
                            >
                                <option value="all">All</option>
                                <option value="PUBLIC">Public</option>
                                <option value="PRIVATE">Private</option>
                            </select>
                        </div>
                    </div>

                    {/* Results Summary */}
                    {(query.trim() || sort !== 'relevant' || visibility !== 'all') && (
                        <div className="text-sm text-muted-foreground">
                            {isLoading ? (
                                "Searching..."
                            ) : (
                                `Found ${totalCount} ${totalCount === 1 ? 'community' : 'communities'}`
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Search Results */}
            {results.length > 0 && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {results.map((community) => (
                            <CommunityCard
                                key={community.id}
                                community={{
                                    ...community,
                                    members: [], // Empty array for now since we don't need it for display
                                    creatorId: community.creator.id,
                                    createdAt: new Date(),
                                    updatedAt: new Date()
                                }}
                                currentUserMembership={community.currentUserMembership}
                            />
                        ))}
                    </div>

                    {/* Infinite scroll trigger */}
                    {hasMore && (
                        <div ref={ref as any} className="py-4">
                            {isLoadingMore && (
                                <div className="flex justify-center">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Loading more results...
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* No Results */}
            {!isLoading && results.length === 0 && (query.trim() || sort !== 'relevant' || visibility !== 'all') && (
                <Card>
                    <CardContent className="text-center py-12">
                        <div className="space-y-2">
                            <Search className="h-12 w-12 text-muted-foreground mx-auto" />
                            <h3 className="text-lg font-medium">No communities found</h3>
                            <p className="text-muted-foreground">
                                Try adjusting your search terms or filters
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Empty State */}
            {!isLoading && results.length === 0 && !query.trim() && sort === 'relevant' && visibility === 'all' && (
                <Card>
                    <CardContent className="text-center py-12">
                        <div className="space-y-2">
                            <Search className="h-12 w-12 text-muted-foreground mx-auto" />
                            <h3 className="text-lg font-medium">Search for Communities</h3>
                            <p className="text-muted-foreground">
                                Enter a search term to find communities that interest you
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
