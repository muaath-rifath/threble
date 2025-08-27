'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConnectionsList } from '@/components/shared/ConnectionsList'
import { ConnectionRequests } from '@/components/shared/ConnectionRequests'
import { ConnectionSuggestions } from '@/components/shared/ConnectionSuggestions'
import { Users, UserPlus, Clock } from 'lucide-react'

function ConnectionsPageContent() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState('connections')

  // Handle URL parameters for tab navigation and hash scrolling
  useEffect(() => {
    const tab = searchParams?.get('tab')
    if (tab && ['connections', 'requests', 'suggestions'].includes(tab)) {
      setActiveTab(tab)
      
      // Handle hash scrolling after tab is set
      setTimeout(() => {
        const hash = window.location.hash
        if (hash) {
          const element = document.querySelector(hash)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }
      }, 100) // Small delay to ensure tab content is rendered
    }
  }, [searchParams])

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Users className="w-8 h-8" />
        <h1 className="text-3xl font-bold">Connections</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="connections" className="flex-1">
            <Users className="w-4 h-4 mr-2" />
            My Connections
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex-1">
            <Clock className="w-4 h-4 mr-2" />
            Requests
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="flex-1">
            <UserPlus className="w-4 h-4 mr-2" />
            Suggestions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connections">
          <ConnectionsList />
        </TabsContent>

        <TabsContent value="requests">
          <ConnectionRequests type="all" />
        </TabsContent>

        <TabsContent value="suggestions">
          <ConnectionSuggestions limit={20} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function ConnectionsPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <ConnectionsPageContent />
    </Suspense>
  )
}