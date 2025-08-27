'use client'

import { useRouter } from 'next/navigation'
import CommunityForm from '@/components/community/CommunityForm'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function CreateCommunityPage() {
    const router = useRouter()

    const handleSuccess = (communityName: string) => {
        // Redirect to the newly created community or communities page
        router.push('/communities')
    }

    const handleCancel = () => {
        router.push('/communities')
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="mb-6">
                <Button 
                    variant="ghost" 
                    onClick={() => router.push('/communities')}
                    className="mb-4"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Communities
                </Button>
                <h1 className="text-3xl font-bold">Create Community</h1>
                <p className="text-muted-foreground mt-1">
                    Start a new community around your interests
                </p>
            </div>

            <CommunityForm 
                onSuccess={handleSuccess}
                onCancel={handleCancel}
            />
        </div>
    )
}
