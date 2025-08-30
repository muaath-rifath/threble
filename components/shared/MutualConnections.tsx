'use client'

import { useState, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { IconUsers } from '@tabler/icons-react'
import Link from 'next/link'

interface MutualConnection {
  id: string
  name: string | null
  username: string | null
  image: string | null
}

interface MutualConnectionsProps {
  userId: string
  limit?: number
  showCount?: boolean
}

export function MutualConnections({ userId, limit = 3, showCount = true }: MutualConnectionsProps) {
  const [mutualConnections, setMutualConnections] = useState<MutualConnection[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMutualConnections = async () => {
      try {
        // This would be a new API endpoint to get mutual connections
        const response = await fetch(`/api/user/connections/mutual/${userId}?limit=${limit}`)
        
        if (response.ok) {
          const data = await response.json()
          setMutualConnections(data.connections || [])
          setTotalCount(data.totalCount || 0)
        }
      } catch (error) {
        console.error('Failed to fetch mutual connections:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMutualConnections()
  }, [userId, limit])

  if (loading || totalCount === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex -space-x-2">
        {mutualConnections.slice(0, 3).map((connection) => (
          <Link key={connection.id} href={`/${connection.username}`}>
            <Avatar className="w-6 h-6 border-2 border-white cursor-pointer hover:opacity-80">
              <AvatarImage src={connection.image || ''} />
              <AvatarFallback className="text-xs">
                {connection.name?.charAt(0) || connection.username?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
          </Link>
        ))}
      </div>
      
      {showCount && (
        <Badge variant="secondary" className="text-xs">
          <IconUsers className="w-3 h-3 mr-1" />
          {totalCount} mutual connection{totalCount !== 1 ? 's' : ''}
        </Badge>
      )}
    </div>
  )
}
