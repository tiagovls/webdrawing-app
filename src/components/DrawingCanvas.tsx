import React, { useRef, useState, useEffect } from 'react'
import { Eraser, Trash2, Undo2 } from 'lucide-react'

interface DrawingCanvasProps {
  onDrawChange: (dataUrl: string | null) => void
  className?: string
}

interface Stroke {
  points: { x: number; y: number }[]
  color: string
  width: number
}

const COLORS = ['#000000', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b']

export function DrawingCanvas({ onDrawChange, className = '' }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState(COLORS[0])
  const [lineWidth, setLineWidth] = useState(3)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null)

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas dimensions to match display size
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height

    // Set white background for the final image to not have transparent BG
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    redraw()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Redraw all strokes
  useEffect(() => {
    redraw()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokes, currentStroke])

  const redraw = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear and set background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes

    allStrokes.forEach(stroke => {
      if (stroke.points.length === 0) return
      
      ctx.beginPath()
      if (stroke.points.length < 3) {
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
        ctx.lineTo(stroke.points[stroke.points.length - 1].x, stroke.points[stroke.points.length - 1].y)
      } else {
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
        for (let i = 1; i < stroke.points.length - 2; i++) {
          const xc = (stroke.points[i].x + stroke.points[i + 1].x) / 2
          const yc = (stroke.points[i].y + stroke.points[i + 1].y) / 2
          ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, xc, yc)
        }
        // curve through the last two points
        ctx.quadraticCurveTo(
          stroke.points[stroke.points.length - 2].x,
          stroke.points[stroke.points.length - 2].y,
          stroke.points[stroke.points.length - 1].x,
          stroke.points[stroke.points.length - 1].y
        )
      }
      
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.width
      ctx.stroke()
    })

    // Only update parent if there are strokes, otherwise send null
    if (strokes.length > 0 || currentStroke) {
      onDrawChange(canvas.toDataURL('image/png'))
    } else {
      onDrawChange(null)
    }
  }

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    
    let clientX, clientY
    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    setIsDrawing(true)
    const { x, y } = getCoordinates(e)
    setCurrentStroke({
      points: [{ x, y }],
      color,
      width: lineWidth
    })
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!isDrawing || !currentStroke) return

    const { x, y } = getCoordinates(e)
    setCurrentStroke({
      ...currentStroke,
      points: [...currentStroke.points, { x, y }]
    })
  }

  const stopDrawing = () => {
    if (isDrawing && currentStroke) {
      setStrokes([...strokes, currentStroke])
      setCurrentStroke(null)
    }
    setIsDrawing(false)
  }

  const undo = () => {
    setStrokes(strokes.slice(0, -1))
  }

  const clear = () => {
    setStrokes([])
    setCurrentStroke(null)
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Canvas */}
      <div className="relative border border-surface-200 rounded-xl overflow-hidden bg-white shadow-inner touch-none">
        <canvas
          ref={canvasRef}
          className="w-full h-48 cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          onTouchCancel={stopDrawing}
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          {COLORS.map(c => (
            <button
              key={c}
              type="button" // prevent form submission
              onClick={() => { setColor(c); setLineWidth(3) }}
              className={`w-6 h-6 rounded-full border-2 transition-all ${color === c && lineWidth === 3 ? 'border-dark-900 scale-110' : 'border-transparent hover:scale-105'}`}
              style={{ backgroundColor: c }}
            />
          ))}
          <div className="w-px h-5 bg-surface-200 mx-1" />
          <button
            type="button"
            onClick={() => { setColor('#ffffff'); setLineWidth(15) }} // Eraser
            className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${color === '#ffffff' ? 'bg-brand-50 text-brand-600 border border-brand-200' : 'text-dark-500 hover:bg-surface-100 hover:text-dark-900'}`}
            title="Gomme"
          >
            <Eraser className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={undo}
            disabled={strokes.length === 0}
            className="p-1.5 text-dark-500 hover:text-dark-900 hover:bg-surface-100 rounded-md transition-all disabled:opacity-30"
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={clear}
            disabled={strokes.length === 0}
            className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-all disabled:opacity-30"
            title="Tout effacer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
