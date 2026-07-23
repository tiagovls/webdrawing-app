'use client'

import { useRef, useState, useEffect } from 'react'
import { Lock } from 'lucide-react'

export function WorkflowVideo() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [progress, setProgress] = useState(0)

  // Force muted property and play() for mobile Safari/Chrome autoplay policy on refresh
  useEffect(() => {
    const video = videoRef.current
    if (video) {
      video.muted = true
      video.play().catch((err) => {
        console.warn('Mobile video autoplay blocked:', err)
      })
    }
  }, [])

  // Update progress as video plays
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime
      const total = videoRef.current.duration
      if (total > 0) {
        setProgress((current / total) * 100)
      }
    }
  }

  // Handle clicking on the progress bar to seek
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current) {
      const bar = e.currentTarget
      const rect = bar.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const newProgress = Math.max(0, Math.min(1, clickX / rect.width))
      videoRef.current.currentTime = newProgress * videoRef.current.duration
    }
  }

  return (
    <div className="relative rounded-xl overflow-hidden shadow-2xl border border-surface-200 bg-white max-w-5xl mx-auto ring-4 ring-brand-500/5 group flex flex-col mb-16">
      
      {/* Browser Header */}
      <div className="bg-surface-50 border-b border-surface-200 px-4 py-3 flex items-center justify-between">
        <div className="flex gap-1.5 w-16">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
          <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
        </div>
        <div className="bg-white border border-surface-200 rounded-md text-[10px] sm:text-xs text-dark-400 font-medium px-4 py-1.5 flex items-center gap-2 shadow-sm flex-1 max-w-sm justify-center">
          <Lock className="w-3 h-3 text-dark-400 mr-1.5" />
          webdrawing.fr
        </div>
        <div className="w-16"></div>
      </div>

      {/* Video Content */}
      <div className="relative bg-surface-100 group">
        <div className="absolute inset-0 bg-dark-900/5 pointer-events-none group-hover:bg-transparent transition-colors z-10" />
        <video 
          ref={videoRef}
          src="/workflow.mp4" 
          autoPlay 
          loop 
          muted 
          playsInline 
          onTimeUpdate={handleTimeUpdate}
          className="w-full h-auto block"
        />
      </div>
        
      {/* Aesthetic Progress Bar */}
      <div className="bg-surface-50 border-t border-surface-200 px-4 py-3">
        <div 
          className="relative h-1.5 bg-surface-200 rounded-full overflow-hidden cursor-pointer group/bar"
          onClick={handleSeek}
        >
          {/* Hover highlight background */}
          <div className="absolute inset-0 bg-dark-900/0 group-hover/bar:bg-dark-900/5 transition-colors" />
          
          {/* Filled progress */}
          <div 
            className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-brand-500 to-brand-400 rounded-full transition-all duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
