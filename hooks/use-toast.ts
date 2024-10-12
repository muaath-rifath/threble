import { useState } from 'react'

interface ToastProps {
  title: string
  description: string
  variant?: 'default' | 'destructive'
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  const addToast = (toast: ToastProps) => {
    setToasts((prev) => [...prev, toast])
    // Remove toast after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t !== toast))
    }, 5000)
  }

  return { toasts, toast: addToast }
}
