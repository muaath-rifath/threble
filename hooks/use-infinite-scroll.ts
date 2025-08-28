'use client'

import { useState, useEffect, useCallback } from 'react'
import { useInView } from '@intersection-observer/next'

interface UseInfiniteScrollOptions<T> {
  initialData?: T[]
  fetchFunction: (cursor: string | null) => Promise<{
    data: T[]
    nextCursor: string | null
    hasMore: boolean
  }>
  enabled?: boolean
}

export function useInfiniteScroll<T>({
  initialData = [],
  fetchFunction,
  enabled = true,
}: UseInfiniteScrollOptions<T>) {
  const [data, setData] = useState<T[]>(initialData)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [cursor, setCursor] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: '100px'
  })

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !enabled) return

    try {
      setLoading(true)
      setError(null)
      
      const result = await fetchFunction(cursor)
      
      setData(prev => [...prev, ...result.data])
      setCursor(result.nextCursor)
      setHasMore(result.hasMore)
    } catch (err) {
      console.error('Error loading more data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load more data')
    } finally {
      setLoading(false)
    }
  }, [cursor, loading, hasMore, enabled, fetchFunction])

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setCursor(null)
      
      const result = await fetchFunction(null)
      
      setData(result.data)
      setCursor(result.nextCursor)
      setHasMore(result.hasMore)
    } catch (err) {
      console.error('Error refreshing data:', err)
      setError(err instanceof Error ? err.message : 'Failed to refresh data')
    } finally {
      setLoading(false)
    }
  }, [fetchFunction])

  const reset = useCallback(() => {
    setData([])
    setCursor(null)
    setHasMore(true)
    setError(null)
  }, [])

  // Load more when in view
  useEffect(() => {
    if (inView && hasMore && !loading && enabled) {
      loadMore()
    }
  }, [inView, hasMore, loading, enabled, loadMore])

  // Initial load if no initial data
  useEffect(() => {
    if (initialData.length === 0 && enabled && !loading && data.length === 0) {
      loadMore()
    }
  }, [initialData.length, enabled, loading, data.length, loadMore])

  return {
    data,
    loading,
    hasMore,
    error,
    loadMore,
    refresh,
    reset,
    ref, // Attach this to the last item or loading indicator
  }
}
