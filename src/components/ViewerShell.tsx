'use client'

import { useState, useRef, useEffect } from 'react'
import * as THREE from 'three'
import dynamic from 'next/dynamic'
import {
  MousePointer2,
  Ruler,
  MessageSquare,
  MessageCircle,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronDown,
  X,
  Send,
  Box,
  Layers,
  Clock,
  User,
  Settings,
  Pin,
  PinOff,
  Edit2,
  Save,
  Menu,
  Undo2,
  Redo2,
} from 'lucide-react'
import type { Annotation } from '@/lib/prisma'
import type { ViewerMode, MeasureUnit } from './ThreeViewer'
import { DeleteButton } from '@/components/DeleteButton'
import { DrawingCanvas } from '@/components/DrawingCanvas'
import { ChatPanel } from '@/components/ChatPanel'

// Dynamic import to avoid SSR (Three.js is browser-only)
const ThreeViewer = dynamic(() => import('./ThreeViewer'), { ssr: false })

interface MeshItem {
  name: string
  uuid: string
  visible: boolean
}

interface Props {
  modelUrl: string
  shareLinkId: string
  initialAnnotations: Annotation[]
  projectName: string
  isOwner?: boolean
  creatorNote?: string | null
}

export default function ViewerShell({
  modelUrl,
  shareLinkId,
  initialAnnotations,
  projectName,
  isOwner,
  creatorNote: initialCreatorNote,
}: Props) {
  const [mode, setMode] = useState<ViewerMode>('orbit')
  const [unit, setUnit] = useState<MeasureUnit>('mm')
  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations)
  const [meshList, setMeshList] = useState<MeshItem[]>([])
  const [meshVisibility, setMeshVisibility] = useState<Record<string, boolean>>({})
  const [rightPanel, setRightPanel] = useState<'annotations' | 'hierarchy' | 'chat' | null>('chat')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [viewerBg, setViewerBg] = useState<'gray'|'white'|'black'|'beige'>('gray')
  const [showGrid, setShowGrid] = useState(true)
  const [selectedMeshes, setSelectedMeshes] = useState<string[]>([])

  const [visibilityHistory, setVisibilityHistory] = useState<Record<string, boolean>[]>([{}])
  const [historyIndex, setHistoryIndex] = useState(0)

  const [editingAnnId, setEditingAnnId] = useState<string | null>(null)
  const [editAnnText, setEditAnnText] = useState('')

  const [creatorNote, setCreatorNote] = useState(initialCreatorNote || '')
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState(initialCreatorNote || '')
  const [isSavingNote, setIsSavingNote] = useState(false)

  const [panelWidth, setPanelWidth] = useState(288)
  const isResizing = useRef(false)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return
      const newWidth = window.innerWidth - e.clientX
      setPanelWidth(Math.max(250, Math.min(newWidth, 800)))
    }
    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault()
        undoVisibility()
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z' || e.key === 'z'))) {
        e.preventDefault()
        redoVisibility()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [visibilityHistory, historyIndex])

  // Annotation dialog state
  const [pendingPos, setPendingPos] = useState<THREE.Vector3 | null>(null)
  const [pendingNormal, setPendingNormal] = useState<THREE.Vector3 | null>(null)
  const [commentText, setCommentText] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [drawingData, setDrawingData] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Camera target callback ref
  const cameraTargetRef = useState<React.MutableRefObject<((pos: THREE.Vector3) => void) | null>>(
    () => ({ current: null }),
  )[0]

  // Active annotation (highlighted)
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null)

  const handleAnnotationPlace = (pos: THREE.Vector3, normal: THREE.Vector3) => {
    setPendingPos(pos)
    setPendingNormal(normal)
    setCommentText('')
    setDrawingData(null)
  }

  const handleSubmitAnnotation = async () => {
    if (!pendingPos || !commentText.trim()) return
    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/annotations/${shareLinkId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          posX: pendingPos.x,
          posY: pendingPos.y,
          posZ: pendingPos.z,
          normX: pendingNormal?.x ?? 0,
          normY: pendingNormal?.y ?? 1,
          normZ: pendingNormal?.z ?? 0,
          text: commentText.trim(),
          drawingData: drawingData,
          author: authorName.trim() || 'Anonymous',
        }),
      })
      const newAnnotation = await res.json()
      setAnnotations((prev) => [...prev, newAnnotation])
      setPendingPos(null)
      setPendingNormal(null)
      setCommentText('')
      setDrawingData(null)
    } catch (e) {
      console.error(e)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAnnotationClick = (ann: Annotation) => {
    setActiveAnnotationId(ann.id)
    setRightPanel('annotations')
    cameraTargetRef.current?.(new THREE.Vector3(ann.posX, ann.posY, ann.posZ))
  }

  const handleMeshToggle = (uuid: string) => {
    const currentState = visibilityHistory[historyIndex] || {}
    const nextState = {
      ...currentState,
      [uuid]: !(currentState[uuid] ?? true)
    }

    const newHistory = visibilityHistory.slice(0, historyIndex + 1)
    newHistory.push(nextState)
    
    setVisibilityHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
    setMeshVisibility(nextState)
  }

  const undoVisibility = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setMeshVisibility(visibilityHistory[newIndex])
    }
  }

  const redoVisibility = () => {
    if (historyIndex < visibilityHistory.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setMeshVisibility(visibilityHistory[newIndex])
    }
  }

  const handleUpdateAnnotation = async (id: string, updates: Partial<Annotation>) => {
    try {
      const res = await fetch(`/api/annotations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to update')
      const updated = await res.json()
      setAnnotations(prev => {
        const next = prev.map(a => a.id === id ? { ...a, ...updated } : a)
        return next.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1
          if (!a.isPinned && b.isPinned) return 1
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        })
      })
      setEditingAnnId(null)
    } catch (e) {
      console.error(e)
    }
  }

  const handleSaveNote = async () => {
    setIsSavingNote(true)
    try {
      const res = await fetch(`/api/share-links/${shareLinkId}`, {
        method: 'PATCH',
        body: JSON.stringify({ creatorNote: noteDraft }),
      })
      if (!res.ok) throw new Error('Failed to save note')
      setCreatorNote(noteDraft)
      setIsEditingNote(false)
    } catch (e) {
      console.error(e)
    } finally {
      setIsSavingNote(false)
    }
  }

  const formatTime = (d: Date | string) => {
    return new Intl.RelativeTimeFormat('fr', { numeric: 'auto' }).format(
      Math.round((new Date(d).getTime() - Date.now()) / 60000),
      'minute',
    )
  }

  return (
    <div className="fixed inset-0 flex flex-col md:flex-row bg-surface-50 overflow-hidden text-dark-900">
      
      {/* ── Desktop Left Toolbar ────────────────────────────────────────────────── */}
      <div className="hidden md:flex w-14 flex-col items-center py-4 gap-2 border-r border-surface-200 z-10 shrink-0 bg-white/80 backdrop-blur-md">
        <ToolBtn active={mode === 'orbit'} onClick={() => setMode('orbit')} icon={MousePointer2} title="Navigation (O)" />
        <ToolBtn active={mode === 'measure'} onClick={() => setMode(mode === 'measure' ? 'orbit' : 'measure')} icon={Ruler} title="Measure (M)" />
        <ToolBtn active={mode === 'annotate'} onClick={() => setMode(mode === 'annotate' ? 'orbit' : 'annotate')} icon={MessageSquare} title="Annotate (A)" />
        <div className="w-6 h-px bg-surface-200 my-1" />
        <button onClick={undoVisibility} disabled={historyIndex <= 0} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${historyIndex > 0 ? 'text-dark-700 hover:text-dark-900 hover:bg-surface-100' : 'text-dark-300 opacity-50'}`} title="Undo visibility (Ctrl+Z)"><Undo2 className="w-4.5 h-4.5" /></button>
        <button onClick={redoVisibility} disabled={historyIndex >= visibilityHistory.length - 1} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${historyIndex < visibilityHistory.length - 1 ? 'text-dark-700 hover:text-dark-900 hover:bg-surface-100' : 'text-dark-300 opacity-50'}`} title="Redo visibility (Ctrl+Y)"><Redo2 className="w-4.5 h-4.5" /></button>
        <div className="w-6 h-px bg-surface-200 my-1" />
        <button onClick={() => setUnit(unit === 'mm' ? 'inch' : 'mm')} className="w-10 h-8 rounded-lg text-[10px] font-bold text-dark-500 hover:text-dark-900 hover:bg-surface-100 transition-all shrink-0" title={`Unit: ${unit === 'mm' ? 'mm' : 'inch'} (click to change)`}>{unit}</button>
        <div className="w-6 h-px bg-surface-200 my-1" />
        <ToolBtn active={isSettingsOpen} onClick={() => setIsSettingsOpen(true)} icon={Settings} title="Settings & Help" />
      </div>

      {/* ── Mobile Top Bar ──────────────────────────────────────────────────────── */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-14 bg-white/90 backdrop-blur-md border-b border-surface-200 z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Box className="w-4 h-4 text-brand-500" />
          <span className="font-semibold text-sm text-dark-900 truncate max-w-[200px]">{projectName}</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-dark-700 hover:text-dark-900">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* ── Mobile Burger Menu Overlay ─────────────────────────────────────────── */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-14 left-0 right-0 bottom-0 bg-surface-50 z-40 flex flex-col p-4 overflow-y-auto">
          <h3 className="text-xs font-bold text-dark-400 uppercase tracking-wider mb-3">Tools</h3>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <button onClick={() => { setMode('orbit'); setIsMobileMenuOpen(false) }} className={`flex flex-col items-center justify-center p-3 rounded-xl border ${mode === 'orbit' ? 'bg-brand-50 border-brand-200 text-brand-600' : 'bg-white border-surface-200 text-dark-700'}`}>
              <MousePointer2 className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-semibold">Navigate</span>
            </button>
            <button onClick={() => { setMode(mode === 'measure' ? 'orbit' : 'measure'); setIsMobileMenuOpen(false) }} className={`flex flex-col items-center justify-center p-3 rounded-xl border ${mode === 'measure' ? 'bg-brand-50 border-brand-200 text-brand-600' : 'bg-white border-surface-200 text-dark-700'}`}>
              <Ruler className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-semibold">Measure</span>
            </button>
            <button onClick={() => { setMode(mode === 'annotate' ? 'orbit' : 'annotate'); setIsMobileMenuOpen(false) }} className={`flex flex-col items-center justify-center p-3 rounded-xl border ${mode === 'annotate' ? 'bg-brand-50 border-brand-200 text-brand-600' : 'bg-white border-surface-200 text-dark-700'}`}>
              <MessageSquare className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-semibold">Annotate</span>
            </button>
          </div>

          <h3 className="text-xs font-bold text-dark-400 uppercase tracking-wider mb-3">Visibility History</h3>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button onClick={undoVisibility} disabled={historyIndex <= 0} className={`flex items-center justify-center gap-2 p-3 rounded-xl border ${historyIndex > 0 ? 'bg-white border-surface-200 text-dark-700 hover:bg-surface-50' : 'bg-surface-50 border-transparent text-dark-300 opacity-60'}`}>
              <Undo2 className="w-4 h-4" />
              <span className="text-[11px] font-semibold">Undo</span>
            </button>
            <button onClick={redoVisibility} disabled={historyIndex >= visibilityHistory.length - 1} className={`flex items-center justify-center gap-2 p-3 rounded-xl border ${historyIndex < visibilityHistory.length - 1 ? 'bg-white border-surface-200 text-dark-700 hover:bg-surface-50' : 'bg-surface-50 border-transparent text-dark-300 opacity-60'}`}>
              <span className="text-[11px] font-semibold">Redo</span>
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          <h3 className="text-xs font-bold text-dark-400 uppercase tracking-wider mb-3">Panels</h3>
          <div className="flex flex-col gap-2 mb-6">
            <button onClick={() => { setRightPanel('chat'); setIsMobileMenuOpen(false) }} className="flex items-center gap-3 p-3 bg-white border border-surface-200 rounded-xl text-dark-900 font-medium">
              <MessageCircle className="w-5 h-5 text-brand-500" /> Chat
            </button>
            <button onClick={() => { setRightPanel('annotations'); setIsMobileMenuOpen(false) }} className="flex items-center gap-3 p-3 bg-white border border-surface-200 rounded-xl text-dark-900 font-medium">
              <MessageSquare className="w-5 h-5 text-brand-500" /> Notes ({annotations.length})
            </button>
            <button onClick={() => { setRightPanel('hierarchy'); setIsMobileMenuOpen(false) }} className="flex items-center gap-3 p-3 bg-white border border-surface-200 rounded-xl text-dark-900 font-medium">
              <Layers className="w-5 h-5 text-brand-500" /> Hierarchy
            </button>
          </div>

          <h3 className="text-xs font-bold text-dark-400 uppercase tracking-wider mb-3">Settings</h3>
          <div className="flex flex-col gap-2">
            <button onClick={() => setUnit(unit === 'mm' ? 'inch' : 'mm')} className="flex items-center justify-between p-3 bg-white border border-surface-200 rounded-xl text-dark-900 font-medium">
              <span>Unit of measurement</span>
              <span className="text-brand-600 text-sm font-bold bg-brand-50 px-2 py-1 rounded-md">{unit.toUpperCase()}</span>
            </button>
            <button onClick={() => { setIsSettingsOpen(true); setIsMobileMenuOpen(false) }} className="flex items-center gap-3 p-3 bg-white border border-surface-200 rounded-xl text-dark-900 font-medium">
              <Settings className="w-5 h-5 text-dark-500" /> Workspace settings
            </button>
          </div>
        </div>
      )}

      {/* ── 3D Canvas ───────────────────────────────────────────────────── */}
      <div className="flex-1 relative min-w-0 h-full">
        {/* Project name header (Desktop only) */}
        <div className="hidden md:flex absolute top-0 left-0 right-0 h-10 items-center px-4 z-10 pointer-events-none">
          <div className="flex items-center gap-2">
            <Box className="w-3.5 h-3.5 text-brand-500" />
            <span className="text-xs text-dark-700 font-medium bg-white/80 backdrop-blur-sm px-2 py-1 rounded-md border border-surface-200">{projectName}</span>
          </div>
        </div>

        <ThreeViewer
          modelUrl={modelUrl}
          mode={mode}
          unit={unit}
          bgColor={viewerBg}
          showGrid={showGrid}
          meshVisibility={meshVisibility}
          selectedMeshes={selectedMeshes}
          onMeshSelect={(uuid) => {
            setSelectedMeshes(uuid ? [uuid] : [])
            if (uuid && meshVisibility[uuid] === false) handleMeshToggle(uuid)
          }}
          onMeshHide={(uuid) => handleMeshToggle(uuid)}
          onAnnotationPlace={handleAnnotationPlace}
          annotations={annotations}
          onAnnotationClick={handleAnnotationClick}
          onMeshListChange={(list) => {
            setMeshList(list)
            const vis: Record<string, boolean> = {}
            list.forEach((m) => { vis[m.uuid] = true })
            setMeshVisibility(vis)
          }}
          cameraTargetRef={cameraTargetRef}
        />

        {/* Branding Badge */}
        <a
          href="https://webdrawing.fr"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-4 right-4 md:right-6 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-white/50 backdrop-blur-md rounded-full shadow-sm border border-surface-200/50 text-[10px] font-medium text-dark-600 hover:text-brand-600 hover:bg-white/80 transition-all pointer-events-auto"
        >
          <span className="opacity-70">Managed by</span>
          <span className="font-bold text-dark-900">Web Drawing</span>
        </a>

        {/* Annotation placement dialog */}
        {pendingPos && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-dark-900/20 backdrop-blur-sm animate-fade-in p-4">
            <div className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-md shadow-2xl border border-surface-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2 text-dark-900 text-sm sm:text-base">
                  <MessageSquare className="w-4 h-4 text-brand-500" />
                  Add a comment
                </h3>
                <button
                  onClick={() => setPendingPos(null)}
                  className="p-1.5 rounded-lg hover:bg-surface-50 text-dark-500 hover:text-dark-900 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <textarea
                autoFocus
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="e.g. Enlarge this hole to Ø12 mm"
                rows={2}
                className="w-full px-3 py-2.5 rounded-xl border border-surface-200 bg-white text-dark-900 placeholder:text-dark-500 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 resize-none text-sm mb-3 shadow-sm"
              />
              <div className="mb-3">
                <p className="text-xs font-semibold text-dark-500 mb-1.5 flex items-center gap-1.5"><Edit2 className="w-3 h-3" /> Drawing (optional)</p>
                <DrawingCanvas onDrawChange={setDrawingData} />
              </div>
              <input
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Your name (optional)"
                className="w-full px-3 py-2.5 rounded-xl border border-surface-200 bg-white text-dark-900 placeholder:text-dark-500 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 text-sm mb-4 shadow-sm"
              />

              <div className="flex gap-2">
                <button
                  onClick={() => setPendingPos(null)}
                  className="flex-1 py-2.5 rounded-xl border border-surface-200 text-sm text-dark-700 hover:text-dark-900 hover:bg-surface-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitAnnotation}
                  disabled={(!commentText.trim() && !drawingData) || isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white text-sm font-medium transition-all shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Sending...' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {isSettingsOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-dark-900/40 backdrop-blur-sm animate-fade-in px-4" onClick={() => setIsSettingsOpen(false)}>
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-surface-200 overflow-hidden" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="bg-surface-50 border-b border-surface-200 px-6 py-4 flex items-center justify-between">
                <h3 className="text-base font-bold text-dark-900 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-brand-500" />
                  Workspace settings
                </h3>
                <button onClick={() => setIsSettingsOpen(false)} className="text-dark-400 hover:text-dark-900 transition-colors p-1 rounded-md hover:bg-surface-200/50">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
                
                {/* Background Colors */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-bold text-dark-400 uppercase tracking-wider">Environment</h4>
                    <button 
                      onClick={() => setShowGrid(!showGrid)} 
                      className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all ${showGrid ? 'bg-brand-50 text-brand-600 border-brand-200' : 'bg-surface-50 text-dark-500 border-surface-200 hover:bg-surface-100'}`}
                    >
                      {showGrid ? 'Grid: On' : 'Grid: Off'}
                    </button>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => setViewerBg('gray')} className={`group relative w-16 h-14 rounded-xl border-2 transition-all ${viewerBg === 'gray' ? 'border-brand-500 ring-4 ring-brand-50' : 'border-surface-200 hover:border-surface-300'} bg-[#e5e7eb] overflow-hidden`}>
                      <span className="absolute inset-x-0 bottom-0 text-[9px] font-bold text-slate-600 pb-1 bg-white/50 backdrop-blur-sm">GRIS</span>
                    </button>
                    <button onClick={() => setViewerBg('white')} className={`group relative w-16 h-14 rounded-xl border-2 transition-all ${viewerBg === 'white' ? 'border-brand-500 ring-4 ring-brand-50' : 'border-surface-200 hover:border-surface-300'} bg-[#ffffff] overflow-hidden`}>
                      <span className="absolute inset-x-0 bottom-0 text-[9px] font-bold text-slate-400 pb-1 bg-surface-50/80 backdrop-blur-sm">BLANC</span>
                    </button>
                    <button onClick={() => setViewerBg('black')} className={`group relative w-16 h-14 rounded-xl border-2 transition-all ${viewerBg === 'black' ? 'border-brand-500 ring-4 ring-brand-50' : 'border-slate-700 hover:border-slate-600'} bg-[#222222] overflow-hidden`}>
                      <span className="absolute inset-x-0 bottom-0 text-[9px] font-bold text-slate-300 pb-1 bg-black/40 backdrop-blur-sm">NOIR</span>
                    </button>
                    <button onClick={() => setViewerBg('beige')} className={`group relative w-16 h-14 rounded-xl border-2 transition-all ${viewerBg === 'beige' ? 'border-brand-500 ring-4 ring-brand-50' : 'border-[#e0d4c3] hover:border-[#d1c2ab]'} bg-[#fcf5eb] overflow-hidden`}>
                      <span className="absolute inset-x-0 bottom-0 text-[9px] font-bold text-[#8a765c] pb-1 bg-black/5 backdrop-blur-sm">BEIGE</span>
                    </button>
                  </div>
                </section>

                {/* History & Undo/Redo */}
                <section>
                  <h4 className="text-xs font-bold text-dark-400 uppercase tracking-wider mb-4">Visibility History</h4>
                  <div className="flex gap-3">
                    <button onClick={undoVisibility} disabled={historyIndex <= 0} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${historyIndex > 0 ? 'bg-white border-surface-200 text-dark-700 hover:bg-surface-50 shadow-sm' : 'bg-surface-50 border-transparent text-dark-300 opacity-60'}`}>
                      <Undo2 className="w-4 h-4" />
                      <span className="text-sm font-semibold">Undo (Ctrl+Z)</span>
                    </button>
                    <button onClick={redoVisibility} disabled={historyIndex >= visibilityHistory.length - 1} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${historyIndex < visibilityHistory.length - 1 ? 'bg-white border-surface-200 text-dark-700 hover:bg-surface-50 shadow-sm' : 'bg-surface-50 border-transparent text-dark-300 opacity-60'}`}>
                      <span className="text-sm font-semibold">Redo (Ctrl+Y)</span>
                      <Redo2 className="w-4 h-4" />
                    </button>
                  </div>
                </section>

                {/* Controls */}
                <section>
                  <h4 className="text-xs font-bold text-dark-400 uppercase tracking-wider mb-4">3D Navigation</h4>
                  
                  {/* PC Version */}
                  <div className="hidden md:block bg-surface-50 p-5 rounded-xl border border-surface-100">
                    <ul className="space-y-3 text-sm text-dark-600">
                      <li className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-dark-900"><MousePointer2 className="w-4 h-4 text-brand-500" /> Left Click</span> 
                        <span className="font-medium text-dark-900">Rotate</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-dark-900"><MousePointer2 className="w-4 h-4 text-brand-500" /> Right Click</span> 
                        <span className="font-medium text-dark-900">Pan</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-dark-900"><span className="font-bold text-[10px] bg-white border border-surface-200 px-1.5 py-0.5 rounded shadow-sm text-dark-700">V</span> + Click</span> 
                        <span className="font-medium text-dark-900">Hide part</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-dark-900"><MousePointer2 className="w-4 h-4 text-brand-500" /> Scroll</span> 
                        <span className="font-medium text-dark-900">Zoom</span>
                      </li>
                    </ul>
                  </div>

                  {/* Mobile Version */}
                  <div className="block md:hidden bg-surface-50 p-5 rounded-xl border border-surface-100 mt-4">
                    <ul className="space-y-4 text-sm text-dark-600">
                      <li className="flex items-center justify-between">
                        <span className="flex items-center gap-3 font-medium text-dark-900"><span className="text-xl">👆</span> 1 Finger</span> 
                        <span className="font-medium text-dark-900">Rotate</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span className="flex items-center gap-3 font-medium text-dark-900"><span className="text-xl">✌️</span> 2 Fingers</span> 
                        <span className="font-medium text-dark-900">Pan / Zoom</span>
                      </li>
                    </ul>
                  </div>
                </section>

                {/* Tools */}
                <section>
                  <h4 className="text-xs font-bold text-dark-400 uppercase tracking-wider mb-4">Features</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-surface-200 rounded-xl p-4 hover:border-brand-200 hover:bg-brand-50/30 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center mb-3">
                        <Ruler className="w-4 h-4" />
                      </div>
                      <h5 className="font-bold text-dark-900 text-sm mb-1.5">Measurement tool</h5>
                      <p className="text-[13px] text-dark-500 leading-relaxed">
                        Switch between <b>Face measure</b> (area, center distance, min/max distances) and <b>Point to point</b> measure.
                      </p>
                    </div>

                    <div className="border border-surface-200 rounded-xl p-4 hover:border-brand-200 hover:bg-brand-50/30 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center mb-3">
                        <Layers className="w-4 h-4" />
                      </div>
                      <h5 className="font-bold text-dark-900 text-sm mb-1.5">Part selection</h5>
                      <p className="text-[13px] text-dark-500 leading-relaxed">
                        In Navigation mode, click on any part to highlight it. It will automatically move to the top of the model tree. Hidden parts are automatically moved to the bottom of the list.
                      </p>
                    </div>

                    <div className="border border-surface-200 rounded-xl p-4 hover:border-brand-200 hover:bg-brand-50/30 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center mb-3">
                        <MessageCircle className="w-4 h-4" />
                      </div>
                      <h5 className="font-bold text-dark-900 text-sm mb-1.5">Live chat</h5>
                      <p className="text-[13px] text-dark-500 leading-relaxed">
                        Chat with other visitors. Type <b>@</b> to mention a part: clicking on the mention in the chat will highlight the part on the 3D model!
                      </p>
                    </div>

                    <div className="border border-surface-200 rounded-xl p-4 hover:border-brand-200 hover:bg-brand-50/30 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center mb-3">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <h5 className="font-bold text-dark-900 text-sm mb-1.5">Comments</h5>
                      <p className="text-[13px] text-dark-500 leading-relaxed">
                        In Annotation mode, click on the model to pin a message. All visitors can edit or highlight (pin) any comment so it appears first.
                      </p>
                    </div>
                  </div>
                </section>

              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Right Panel ─────────────────────────────────────────────────── */}
      <div 
        className={`shrink-0 flex flex-col border-l border-surface-200 bg-white/95 md:bg-white/80 backdrop-blur-xl absolute md:relative right-0 top-0 bottom-0 z-40 shadow-2xl md:shadow-none transition-transform duration-300 md:transition-none md-dynamic-width ${rightPanel ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}
        style={{ 
          maxWidth: '100vw'
        }}
      >
        <style dangerouslySetInnerHTML={{__html: `
          @media (min-width: 768px) {
            .md-dynamic-width { width: ${rightPanel ? panelWidth : 0}px !important; }
          }
          @media (max-width: 767px) {
            .md-dynamic-width { width: 100vw !important; }
          }
        `}} />
        
        {/* Resize Handle (Desktop only) */}
        <div 
          className="hidden md:block absolute left-0 top-0 bottom-0 w-1.5 -ml-[3px] cursor-col-resize hover:bg-brand-500/50 z-20 transition-colors"
          onMouseDown={() => {
            isResizing.current = true
            document.body.style.cursor = 'col-resize'
            document.body.style.userSelect = 'none'
          }}
        />

        {/* Panel tabs */}
        <div className="flex border-b border-surface-200 overflow-x-auto custom-scrollbar shrink-0 md-dynamic-width items-center bg-surface-50">
          <div className="flex flex-1">
            <PanelTab active={rightPanel === 'chat'} onClick={() => setRightPanel(rightPanel === 'chat' ? null : 'chat')} icon={MessageCircle} label="Chat" />
            <PanelTab active={rightPanel === 'annotations'} onClick={() => setRightPanel(rightPanel === 'annotations' ? null : 'annotations')} icon={MessageSquare} label={`Notes (${annotations.length})`} />
            <PanelTab active={rightPanel === 'hierarchy'} onClick={() => setRightPanel(rightPanel === 'hierarchy' ? null : 'hierarchy')} icon={Layers} label="Hierarchy" />
          </div>
          <button onClick={() => setRightPanel(null)} className="md:hidden p-3 text-dark-500 hover:text-dark-900 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Panel content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
          {rightPanel === 'chat' && (
            <ChatPanel 
              shareLinkId={shareLinkId}
              meshList={meshList}
              onMeshSelect={(uuid) => {
                setSelectedMeshes([uuid])
                if (meshVisibility[uuid] === false) handleMeshToggle(uuid)
              }}
            />
          )}

          {rightPanel === 'annotations' && (
            <div className="p-3 space-y-2">
              {/* Creator Note Section */}
              {(creatorNote || isOwner) && (
                <div className="mb-4 bg-brand-50 border border-brand-200 rounded-xl p-3 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-brand-700 uppercase tracking-widest flex items-center gap-1.5">
                      <Pin className="w-3.5 h-3.5" /> Creator's note
                    </h4>
                    {isOwner && (
                      <button
                        onClick={() => setIsEditingNote(!isEditingNote)}
                        className="text-brand-600 hover:text-brand-800 p-1 rounded-md hover:bg-brand-100 transition-colors"
                      >
                        {isEditingNote ? <X className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                  {isEditingNote ? (
                    <div className="space-y-2">
                      <textarea
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        className="w-full text-sm p-2 rounded-lg border border-brand-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white"
                        rows={3}
                        placeholder="Add an important note for visitors..."
                      />
                      <div className="flex justify-end">
                        <button
                          onClick={handleSaveNote}
                          disabled={isSavingNote}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white text-xs font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50"
                        >
                          {isSavingNote ? '...' : <><Save className="w-3.5 h-3.5" /> Save</>}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-brand-900 whitespace-pre-wrap leading-relaxed">
                      {creatorNote || "No note."}
                    </p>
                  )}
                </div>
              )}

              {annotations.length === 0 ? (
                <div className="text-center py-10 text-dark-500 text-sm">
                  <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-30 text-dark-400" />
                  <p>No comments</p>
                  <p className="text-xs mt-1">Activate annotation mode and click on the model</p>
                </div>
              ) : (
                annotations.map((ann) => (
                  <div
                    key={ann.id}
                    className={`w-full text-left rounded-xl p-3 border transition-all group shadow-sm bg-white ${
                      activeAnnotationId === ann.id
                        ? 'border-brand-500/50 bg-brand-50'
                        : 'border-surface-200 hover:border-brand-300'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 cursor-pointer" onClick={() => handleAnnotationClick(ann)}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5 shadow-sm ${ann.isPinned ? 'bg-amber-500' : 'bg-brand-500'}`}>
                        {ann.isPinned ? <Pin className="w-3 h-3" /> : ann.index}
                      </div>
                      <div className="flex-1 min-w-0">
                        {editingAnnId === ann.id ? (
                          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                            <textarea
                              value={editAnnText}
                              onChange={(e) => setEditAnnText(e.target.value)}
                              className="w-full text-sm p-2 rounded-lg border focus:border-brand-500 focus:ring-1 bg-white"
                              rows={2}
                            />
                            <div className="flex justify-end gap-2">
                              <button onClick={() => setEditingAnnId(null)} className="text-xs text-dark-500 hover:text-dark-700 font-medium">Cancel</button>
                              <button onClick={() => handleUpdateAnnotation(ann.id, { text: editAnnText })} className="text-xs bg-brand-100 text-brand-700 px-2.5 py-1.5 rounded-md hover:bg-brand-200 font-semibold">Save</button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {ann.text && <p className="text-sm text-dark-900 leading-snug break-words">{ann.text}</p>}
                            {ann.drawingData && (
                              <img src={ann.drawingData} alt="Drawing" className="w-full max-h-48 object-contain rounded-lg border border-surface-200 bg-white" />
                            )}
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10px] text-dark-500 flex items-center gap-1">
                            <User className="w-2.5 h-2.5" />
                            {ann.author}
                          </span>
                          
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => handleUpdateAnnotation(ann.id, { isPinned: !ann.isPinned })}
                              className={`p-1 rounded transition-colors ${ann.isPinned ? 'text-amber-500 hover:bg-amber-50' : 'text-dark-400 hover:text-dark-700 hover:bg-surface-100'}`}
                              title={ann.isPinned ? "Unpin" : "Pin"}
                            >
                              {ann.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => {
                                setEditingAnnId(ann.id)
                                setEditAnnText(ann.text)
                              }}
                              className="p-1 text-dark-400 hover:text-brand-600 rounded hover:bg-brand-50 transition-colors"
                              title="Modifier"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <DeleteButton
                              url={`/api/annotations/${ann.id}`}
                              confirmMessage="Are you sure you want to delete this comment?"
                              onSuccess={() => setAnnotations(prev => prev.filter(a => a.id !== ann.id))}
                              iconOnly
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {rightPanel === 'hierarchy' && (
            <div className="p-3 relative">
              <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl pb-2 mb-3 border-b border-surface-200 flex items-center justify-between -mx-1 px-1 pt-1">
                <span className="text-[11px] font-bold text-dark-400 uppercase tracking-widest">Hierarchy</span>
                <button
                   onClick={() => {
                     const allVis: Record<string, boolean> = {}
                     meshList.forEach(m => allVis[m.uuid] = true)
                     
                     const newHistory = visibilityHistory.slice(0, historyIndex + 1)
                     newHistory.push(allVis)
                     setVisibilityHistory(newHistory)
                     setHistoryIndex(newHistory.length - 1)
                     setMeshVisibility(allVis)
                     
                     setSelectedMeshes([])
                   }}
                   className="text-[11px] font-semibold text-brand-600 hover:text-white bg-brand-50 hover:bg-brand-500 transition-all px-2.5 py-1.5 rounded-md shadow-sm"
                   title="Show all parts and clear selection"
                >
                  Show all
                </button>
              </div>

              <div className="space-y-1">
                {meshList.length === 0 ? (
                  <p className="text-center text-dark-500 text-sm py-10">Loading...</p>
                ) : (
                  [...meshList]
                    .sort((a, b) => {
                      const aVis = meshVisibility[a.uuid] ?? true
                      const bVis = meshVisibility[b.uuid] ?? true
                      
                      // Hidden meshes go to the bottom
                      if (aVis && !bVis) return -1
                      if (!aVis && bVis) return 1

                      const aSel = selectedMeshes.includes(a.uuid)
                      const bSel = selectedMeshes.includes(b.uuid)
                      
                      // Selected meshes go to the top (among visible ones)
                      if (aSel && !bSel) return -1
                      if (!aSel && bSel) return 1
                      
                      return a.name.localeCompare(b.name)
                    })
                  .map((mesh) => {
                    const isSelected = selectedMeshes.includes(mesh.uuid)
                    return (
                      <div
                        key={mesh.uuid}
                        onClick={() => {
                          if (isSelected) setSelectedMeshes(selectedMeshes.filter(id => id !== mesh.uuid))
                          else setSelectedMeshes([mesh.uuid])
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer group transition-all border ${
                          isSelected ? 'bg-brand-50 border-brand-300' : 'bg-surface-50 border-transparent hover:bg-surface-100'
                        }`}
                      >
                        <Box className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-brand-600' : 'text-dark-400'}`} />
                        <span
                          className={`flex-1 text-xs truncate ${
                            isSelected ? 'text-brand-700 font-bold' : (meshVisibility[mesh.uuid] ?? true) ? 'text-dark-900 font-medium' : 'text-dark-400'
                          }`}
                          title={mesh.name}
                        >
                          {mesh.name || 'Unnamed'}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMeshToggle(mesh.uuid)
                          }}
                          className={`transition-opacity p-1 rounded hover:bg-surface-200 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        >
                          {(meshVisibility[mesh.uuid] ?? true) ? (
                            <Eye className={`w-3.5 h-3.5 ${isSelected ? 'text-brand-600' : 'text-dark-500'}`} />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5 text-dark-400" />
                          )}
                        </button>
                      </div>
                    )
                  })
              )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ToolBtn({
  active,
  onClick,
  icon: Icon,
  title,
  className = ''
}: {
  active: boolean
  onClick: () => void
  icon: React.ElementType
  title: string
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
        active
          ? 'bg-brand-50 text-brand-600 shadow-sm border border-brand-200'
          : 'text-dark-500 hover:text-dark-900 hover:bg-surface-50 border border-transparent'
      } ${className}`}
    >
      <Icon className="w-4.5 h-4.5" />
    </button>
  )
}

function PanelTab({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ElementType
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-all border-b-2 ${
        active
          ? 'border-brand-500 text-brand-600 bg-brand-50/50'
          : 'border-transparent text-dark-500 hover:text-dark-900 hover:bg-surface-50'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="truncate">{label}</span>
    </button>
  )
}
