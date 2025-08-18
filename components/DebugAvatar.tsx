import { useEffect } from 'react'

export const DebugAvatar = ({ src, alt, fallback }: { src?: string; alt?: string; fallback?: string }) => {
    useEffect(() => {
        console.log('DebugAvatar props:', { src, alt, fallback })
        
        if (src) {
            // Test if the image URL is accessible
            const img = new Image()
            img.onload = () => console.log('✅ Image loaded successfully:', src)
            img.onerror = () => console.log('❌ Image failed to load:', src)
            img.src = src
        }
    }, [src, alt, fallback])

    return null
}
