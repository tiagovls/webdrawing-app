'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

interface DeleteButtonProps {
  url: string
  confirmMessage: string
  onSuccess?: () => void
  className?: string
  iconOnly?: boolean
  label?: string
}

export function DeleteButton({ url, confirmMessage, onSuccess, className, iconOnly, label }: DeleteButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault() // prevent navigating if it's inside a Link
    e.stopPropagation() // prevent bubbling if inside a button
    
    if (!window.confirm(confirmMessage)) return

    setIsDeleting(true)
    try {
      const res = await fetch(url, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      
      if (onSuccess) {
        onSuccess()
      } else {
        router.refresh()
      }
    } catch (err) {
      console.error(err)
      alert('Error during deletion')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      title="Delete"
      className={className || "p-2 rounded-lg text-red-600/70 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-50"}
    >
      <Trash2 className="w-4 h-4" />
      {label && <span className="ml-2">{label}</span>}
      {!iconOnly && !label && <span className="sr-only">Delete</span>}
    </button>
  )
}
