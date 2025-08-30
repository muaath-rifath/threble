"use client"

import { useEffect, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { IconUsers, IconPlus, IconUserPlus, IconRefresh } from '@tabler/icons-react'
import Link from 'next/link'

interface Community {
  id: string
  name: string
  description: string | null
  image: string | null
  coverImage: string | null
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
  suggestion: {
    reason: string
    users: Array<{
      id: string
      name: string | null
      username: string | null
      image: string | null
    }>
    totalCount: number
  }
}

interface UserSuggestion {
  id: string
  name: string | null
  username: string | null
  image: string | null
  profile?: {
    bio: string | null
    location: string | null
  }
  suggestion: {
    reason: string
    mutualConnections: Array<{
      id: string
      name: string | null
      username: string | null
      image: string | null
    }>
    mutualConnectionCount: number
    reasonText: string
  }
}

function RightSidebar(){
    const [suggestedCommunities, setSuggestedCommunities] = useState<Community[]>([])
    const [suggestedPeople, setSuggestedPeople] = useState<UserSuggestion[]>([])
    const [communitiesLoading, setCommunitiesLoading] = useState(true)
    const [peopleLoading, setPeopleLoading] = useState(true)
    const [communitiesMessage, setCommunitiesMessage] = useState<string | null>(null)
    const [peopleMessage, setPeopleMessage] = useState<string | null>(null)

    useEffect(() => {
        fetchSuggestedCommunities()
        fetchSuggestedPeople()
    }, [])

    const fetchSuggestedCommunities = async () => {
        try {
            const response = await fetch('/api/user/suggestions/communities?limit=3')
            if (response.ok) {
                const data = await response.json()
                setSuggestedCommunities(data.communities)
                setCommunitiesMessage(data.message)
            }
        } catch (error) {
            console.error('Error fetching community suggestions:', error)
        } finally {
            setCommunitiesLoading(false)
        }
    }

    const fetchSuggestedPeople = async () => {
        try {
            const response = await fetch('/api/user/suggestions/people?limit=3')
            if (response.ok) {
                const data = await response.json()
                setSuggestedPeople(data.suggestions)
                setPeopleMessage(data.message)
            }
        } catch (error) {
            console.error('Error fetching people suggestions:', error)
        } finally {
            setPeopleLoading(false)
        }
    }

    const handleJoinCommunity = async (communityId: string) => {
        try {
            const response = await fetch(`/api/communities/${communityId}/members`, {
                method: 'POST'
            })
            
            if (response.ok) {
                // Remove from suggestions after joining
                setSuggestedCommunities(prev => prev.filter(c => c.id !== communityId))
            } else {
                const data = await response.json()
                console.error('Error joining community:', data.error)
                // Could show toast notification here
            }
        } catch (error) {
            console.error('Error joining community:', error)
        }
    }

    const handleConnectUser = async (userId: string) => {
        try {
            const response = await fetch('/api/user/connections', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    targetUserId: userId,
                    action: 'send_request'
                })
            })
            
            if (response.ok) {
                // Remove from suggestions after sending request
                setSuggestedPeople(prev => prev.filter(p => p.id !== userId))
            } else {
                const data = await response.json()
                console.error('Error sending connection request:', data.error)
                // Could show toast notification here
            }
        } catch (error) {
            console.error('Error sending connection request:', error)
        }
    }

    return(
        <section className="custom-scrollbar rightsidebar">
            {/* Suggested Communities Card */}
            <div className="bg-glassmorphism dark:bg-glassmorphism-dark backdrop-blur-xl border border-glass-border dark:border-glass-border-dark rounded-2xl p-6 shadow-xl mb-6 mx-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-heading4-medium text-black dark:text-white flex items-center gap-2">
                            <IconUsers className="w-5 h-5 text-primary-500" />
                            Suggested Communities
                        </h3>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={fetchSuggestedCommunities}
                            disabled={communitiesLoading}
                            className="h-8 w-8 p-0 hover:bg-primary-500/10 rounded-full"
                        >
                            <IconRefresh className={`h-4 w-4 ${communitiesLoading ? 'animate-spin' : ''} text-primary-500`} />
                        </Button>
                    </div>
                    
                    <div className="space-y-3">
                        {communitiesLoading ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="animate-pulse">
                                        <div className="h-16 bg-gray-200/50 dark:bg-gray-700/50 rounded-lg"></div>
                                    </div>
                                ))}
                            </div>
                        ) : suggestedCommunities.length > 0 ? (
                            suggestedCommunities.map(community => (
                                <div key={community.id} className="p-3 bg-white/10 dark:bg-white/5 rounded-lg border border-black/10 dark:border-white/10 hover:border-primary-500/50 hover:bg-white/20 dark:hover:bg-white/10 transition-all duration-200 group">
                                    <div className="flex items-center gap-3 flex-1">
                                        <Avatar className="h-10 w-10 ring-2 ring-transparent group-hover:ring-primary-500/30 transition-all duration-200">
                                            <AvatarImage src={community.image || undefined} />
                                            <AvatarFallback>
                                                <IconUsers className="h-5 w-5" />
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <Link href={`/communities/${community.id}`}>
                                                <h4 className="font-medium text-sm text-black dark:text-white group-hover:text-primary-500 cursor-pointer truncate transition-colors duration-200">
                                                    {community.name}
                                                </h4>
                                            </Link>
                                            <div className="flex items-center space-x-2 mt-1">
                                                <Badge variant="secondary" className="text-xs">
                                                    {community._count.members} members
                                                </Badge>
                                                {community.suggestion.totalCount > 0 && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {community.suggestion.totalCount} {community.suggestion.reason === 'connections' ? 'connections' : 'following'}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-primary-500 mt-1">
                                                {community.suggestion.reason === 'popular' 
                                                    ? 'Popular community'
                                                    : `${community.suggestion.totalCount} ${community.suggestion.reason === 'connections' ? 'connections' : 'following'} are here`
                                                }
                                            </p>
                                        </div>
                                        <Button 
                                            size="sm" 
                                            onClick={() => handleJoinCommunity(community.id)}
                                            className="h-8 px-3 text-xs bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-all duration-200 hover:scale-105"
                                        >
                                            <IconPlus className="h-3 w-3 mr-1" />
                                            Join
                                        </Button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-4 bg-white/10 dark:bg-white/5 rounded-lg border border-black/10 dark:border-white/10">
                                <div className="text-center">
                                    <IconUsers className="h-10 w-10 text-black/40 dark:text-white/40 mx-auto mb-3" />
                                    <p className="text-sm text-black/60 dark:text-white/60">
                                        {communitiesMessage || "No community suggestions available"}
                                    </p>
                                    <Link href="/communities">
                                        <Button size="sm" variant="outline" className="mt-3 text-xs">
                                            Explore Communities
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        )}
                        
                        {suggestedCommunities.length > 0 && (
                            <div className="text-center pt-2">
                                <Link href="/communities">
                                    <Button size="sm" variant="ghost" className="text-xs text-primary-500 hover:text-primary-600">
                                        See more suggestions
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* People You May Know Card */}
                <div className="bg-glassmorphism dark:bg-glassmorphism-dark backdrop-blur-xl border border-glass-border dark:border-glass-border-dark rounded-2xl p-6 shadow-xl mx-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-heading4-medium text-black dark:text-white flex items-center gap-2">
                            <IconUserPlus className="w-5 h-5 text-primary-500" />
                            People You May Know
                        </h3>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={fetchSuggestedPeople}
                            disabled={peopleLoading}
                            className="h-8 w-8 p-0 hover:bg-primary-500/10 rounded-full"
                        >
                            <IconRefresh className={`h-4 w-4 ${peopleLoading ? 'animate-spin' : ''} text-primary-500`} />
                        </Button>
                    </div>
                    
                    <div className="space-y-3">
                        {peopleLoading ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="animate-pulse">
                                        <div className="h-20 bg-gray-200/50 dark:bg-gray-700/50 rounded-lg"></div>
                                    </div>
                                ))}
                            </div>
                        ) : suggestedPeople.length > 0 ? (
                            suggestedPeople.map(person => (
                                <div key={person.id} className="p-3 bg-white/10 dark:bg-white/5 rounded-lg border border-black/10 dark:border-white/10 hover:border-primary-500/50 hover:bg-white/20 dark:hover:bg-white/10 transition-all duration-200 group">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Avatar className="h-11 w-11 ring-2 ring-transparent group-hover:ring-primary-500/30 transition-all duration-200">
                                            <AvatarImage src={person.image || undefined} />
                                            <AvatarFallback>
                                                {person.name?.[0] || person.username?.[0] || 'U'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <Link href={`/${person.username}`}>
                                                <h4 className="font-medium text-sm text-black dark:text-white group-hover:text-primary-500 cursor-pointer transition-colors duration-200">
                                                    {person.name || person.username}
                                                </h4>
                                            </Link>
                                            <p className="text-xs text-black/60 dark:text-white/60 truncate">
                                                @{person.username}
                                            </p>
                                            {person.suggestion.mutualConnections.length > 0 && (
                                                <div className="flex items-center gap-2 mt-1">
                                                    <div className="flex -space-x-1">
                                                        {person.suggestion.mutualConnections.slice(0, 3).map((connection, idx) => (
                                                            <Avatar key={connection.id} className="h-4 w-4 border border-background">
                                                                <AvatarImage src={connection.image || undefined} />
                                                                <AvatarFallback className="text-[8px]">
                                                                    {connection.name?.[0] || connection.username?.[0]}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                        ))}
                                                    </div>
                                                    <p className="text-xs text-black/60 dark:text-white/60">
                                                        {person.suggestion.reasonText}
                                                    </p>
                                                </div>
                                            )}
                                            {person.suggestion.mutualConnections.length === 0 && (
                                                <p className="text-xs text-primary-500 mt-1">
                                                    New member
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button 
                                            size="sm" 
                                            onClick={() => handleConnectUser(person.id)}
                                            className="flex-1 h-8 text-xs bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-all duration-200 hover:scale-105"
                                        >
                                            <IconUserPlus className="h-3 w-3 mr-1" />
                                            Connect
                                        </Button>
                                        <Link href={`/${person.username}`}>
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                className="h-8 px-3 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                                            >
                                                View
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-4 bg-white/10 dark:bg-white/5 rounded-lg border border-black/10 dark:border-white/10">
                                <div className="text-center">
                                    <IconUserPlus className="h-10 w-10 text-black/40 dark:text-white/40 mx-auto mb-3" />
                                    <p className="text-sm text-black/60 dark:text-white/60">
                                        {peopleMessage || "No people suggestions available"}
                                    </p>
                                    <Link href="/connections">
                                        <Button size="sm" variant="outline" className="mt-3 text-xs">
                                            Find Connections
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        )}
                        
                        {suggestedPeople.length > 0 && (
                            <div className="text-center pt-2">
                                <Link href="/connections">
                                    <Button size="sm" variant="ghost" className="text-xs text-primary-500 hover:text-primary-600">
                                        See more suggestions
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
        </section>
    )
}

export default RightSidebar