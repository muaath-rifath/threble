'use client'

import { useState, useEffect } from 'react'

interface MediaContentProps {
    mediaAttachments: string[];
    className?: string;
}

export default function MediaContent({ mediaAttachments, className = "" }: MediaContentProps) {
    if (!mediaAttachments?.length) return null;

    return (
        <div className={`mt-4 grid grid-cols-${mediaAttachments.length === 1 ? '1' : '2'} gap-2 ${className}`}>
            {mediaAttachments.map((url, index) => {
                const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                const isVideo = url.match(/\.(mp4|webm|ogg)$/i);

                if (isImage) {
                    return (
                        <div key={url} className={`relative bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden ${
                            mediaAttachments.length === 1 ? 'aspect-auto max-h-[512px]' : 'aspect-square'
                        }`}>
                            <img
                                src={url}
                                alt={`Media ${index + 1}`}
                                className={`w-full h-full ${
                                    mediaAttachments.length === 1 ? 'object-contain' : 'object-cover'
                                }`}
                                loading="lazy"
                            />
                        </div>
                    );
                }

                if (isVideo) {
                    return (
                        <div key={url} className={`relative bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden ${
                            mediaAttachments.length === 1 ? 'aspect-video' : 'aspect-square'
                        }`}>
                            <video
                                src={url}
                                className="w-full h-full object-cover"
                                controls
                                preload="metadata"
                            />
                        </div>
                    );
                }

                return null;
            })}
        </div>
    );
}