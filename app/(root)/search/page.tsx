import { Metadata } from 'next'
import GlobalSearch from '@/components/search/GlobalSearch'

export const metadata: Metadata = {
  title: 'Search - Threble',
  description: 'Search posts, users, and communities on Threble',
}

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams
  const initialQuery = q || ''

  return (
    <div className="container mx-auto py-6">
      <GlobalSearch initialQuery={initialQuery} />
    </div>
  )
}
