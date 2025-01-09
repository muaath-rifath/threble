import { useState } from 'react'

interface ToastProps {
  id: string; // Add id property to the interface
  title: string
  description: string
  variant?: 'default' | 'destructive'
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([])

    const addToast = (toast: Omit<ToastProps, 'id'>) => { // Adjust addToast parameter
        const id = String(Date.now()) // Generates a unique id
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id )) // Adjust filter
    }, 5000)
  }

  return { toasts, toast: addToast }
}