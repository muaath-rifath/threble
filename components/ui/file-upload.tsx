import { cn } from "@/lib/utils";
import React, { useRef, useState, ChangeEvent } from "react";
import { Label } from './label'
import { IconX } from '@tabler/icons-react'

interface FileUploadProps {
  onChange: (files: File[]) => void;
  multiple?: boolean;
  accept?: string;
  maxSize?: number; // in MB
  maxFiles?: number;
  label?: string;
}

export function FileUpload({
  onChange,
  multiple = false,
  accept = "image/*",
  maxSize = 5, // 5MB default
  maxFiles = 4,
  label = "Upload Files"
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  const validateFile = (file: File): boolean => {
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File size should not exceed ${maxSize}MB`);
      return false;
    }

    if (!file.type.match(/(image|video|audio)\//)) {
      setError('Invalid file type. Only images, videos, and audio files are allowed.');
      return false;
    }

    return true;
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selectedFiles = Array.from(e.target.files || []);

    if (multiple && selectedFiles.length + files.length > maxFiles) {
      setError(`You can only upload up to ${maxFiles} files`);
      return;
    }

    const validFiles = selectedFiles.filter(validateFile);
    if (validFiles.length === 0) return;

    const newFiles = multiple ? [...files, ...validFiles] : validFiles;
    setFiles(newFiles);
    onChange(newFiles);

    // Create previews for images and videos
    validFiles.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
          setPreviews(prev => [...prev, canvas.toDataURL()]);
        };
        video.src = URL.createObjectURL(file);
      }
    });
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setFiles(newFiles);
    setPreviews(newPreviews);
    onChange(newFiles);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <Label>{label}</Label>
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-glass-border dark:border-glass-border-dark bg-glassmorphism dark:bg-glassmorphism-dark backdrop-blur-xl rounded-2xl p-8 cursor-pointer hover:border-primary-500/50 dark:hover:border-primary-500/50 hover:bg-white/20 dark:hover:bg-white/10 transition-all duration-200">
          <input
            type="file"
            onChange={handleFileChange}
            accept={accept}
            multiple={multiple}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <div className="flex flex-col items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-black/60 dark:text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="text-sm text-black dark:text-white font-medium">
                {multiple ? 'Drop files or click to upload' : 'Drop a file or click to upload'}
              </span>
              <span className="text-xs text-black/60 dark:text-white/60">
                Maximum file size: {maxSize}MB
              </span>
            </div>
          </label>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-2xl bg-red-500/20 dark:bg-red-500/20 border border-red-500/30 dark:border-red-500/30 backdrop-blur-xl">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {files.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {files.map((file, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square rounded-2xl overflow-hidden bg-glassmorphism dark:bg-glassmorphism-dark backdrop-blur-xl border border-glass-border dark:border-glass-border-dark">
                {file.type.startsWith('image/') ? (
                  <img
                    src={previews[index]}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : file.type.startsWith('video/') ? (
                  <div className="relative w-full h-full">
                    <img
                      src={previews[index]}
                      alt={`Video thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-12 h-12 text-white opacity-80" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8 5v10l8-5-8-5z"/>
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-black/60 dark:text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
                    </svg>
                  </div>
                )}
              </div>
              <button
                onClick={() => removeFile(index)}
                className="absolute -top-2 -right-2 bg-red-500/20 dark:bg-red-500/20 backdrop-blur-xl border border-red-500/30 dark:border-red-500/30 text-red-600 dark:text-red-400 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-500/30 dark:hover:bg-red-500/30"
                title="Remove file"
              >
                <IconX className="w-4 h-4" />
              </button>
              <p className="mt-2 text-xs text-black/60 dark:text-white/60 truncate font-medium">
                {file.name}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
