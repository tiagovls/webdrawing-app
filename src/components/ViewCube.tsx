'use client'

import React, { useState, useRef } from 'react'

export type ViewCubeFace = 'front' | 'back' | 'top' | 'bottom' | 'left' | 'right'

interface Props {
  onFaceClick: (face: ViewCubeFace) => void
  onDrag?: (dx: number, dy: number) => void
  cubeRef: React.RefObject<HTMLDivElement | null>
}

export function ViewCube({ onFaceClick, onDrag, cubeRef }: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const lastPos = useRef({ x: 0, y: 0 })
  const dragDist = useRef(0)
  const pressedFace = useRef<ViewCubeFace | null>(null)

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setIsDragging(true)
    dragDist.current = 0
    lastPos.current = { x: e.clientX, y: e.clientY }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y
    dragDist.current += Math.abs(dx) + Math.abs(dy)
    lastPos.current = { x: e.clientX, y: e.clientY }
    onDrag?.(dx, dy)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId)
    setIsDragging(false)
    if (dragDist.current < 5 && pressedFace.current) {
      onFaceClick(pressedFace.current)
    }
    pressedFace.current = null
  }

  return (
    <div 
      className="absolute bottom-6 left-6 z-20 view-cube-container cursor-grab active:cursor-grabbing"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div ref={cubeRef} className="view-cube">
        <div className="view-cube-face view-cube-front" onPointerDown={() => pressedFace.current = 'front'}>
          Front
        </div>
        <div className="view-cube-face view-cube-back" onPointerDown={() => pressedFace.current = 'back'}>
          Back
        </div>
        <div className="view-cube-face view-cube-top" onPointerDown={() => pressedFace.current = 'top'}>
          Top
        </div>
        <div className="view-cube-face view-cube-bottom" onPointerDown={() => pressedFace.current = 'bottom'}>
          Bottom
        </div>
        <div className="view-cube-face view-cube-left" onPointerDown={() => pressedFace.current = 'left'}>
          Left
        </div>
        <div className="view-cube-face view-cube-right" onPointerDown={() => pressedFace.current = 'right'}>
          Right
        </div>
      </div>
    </div>
  )
}
