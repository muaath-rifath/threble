'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { IconSearch, IconCompass, IconPlus, IconUsers } from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import CommunityDiscovery from './CommunityDiscovery'
import CommunitySearch from './CommunitySearch'
import YourCommunities from './YourCommunities'

export default function CommunityExplorer() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState('your-communities')

    const handleCreateCommunity = () => {
        router.push('/communities/create')
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Communities</h1>
                        <p className="text-muted-foreground mt-1">
                            Discover and join communities that match your interests
                        </p>
                    </div>
                    <Button onClick={handleCreateCommunity} className="flex items-center gap-2">
                        <IconPlus className="h-4 w-4" />
                        Create Community
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="your-communities" className="flex items-center gap-2">
                        <IconUsers className="h-4 w-4" />
                        <span className="hidden sm:inline">Your Communities</span>
                        <span className="sm:hidden">Your</span>
                    </TabsTrigger>
                    <TabsTrigger value="discover" className="flex items-center gap-2">
                        <IconCompass className="h-4 w-4" />
                        Discover
                    </TabsTrigger>
                    <TabsTrigger value="search" className="flex items-center gap-2">
                        <IconSearch className="h-4 w-4" />
                        Search
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="your-communities" className="space-y-6">
                    <YourCommunities />
                </TabsContent>

                <TabsContent value="discover" className="space-y-6">
                    <CommunityDiscovery />
                </TabsContent>

                <TabsContent value="search" className="space-y-6">
                    <CommunitySearch />
                </TabsContent>
            </Tabs>
        </div>
    )
}
