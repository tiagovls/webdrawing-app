
'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, File, CheckCircle2, AlertCircle, X, Box } from 'lucide-react'
import { formatFileSize } from '@/lib/utils'

type UploadState = 'idle' | 'dragging' | 'selected' | 'uploading' | 'done' | 'error'

export default function UploadPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [state, setState] = useState<UploadState>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [projectName, setProjectName] = useState('')
  const [error, setError] = useState('')

  const acceptFile = useCallback((f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase()
    if (ext !== 'glb' && ext !== 'gltf') {
      setError('Unsupported format. Please use a .glb or .gltf file')
      setState('error')
      return
    }
    if (f.size > 500 * 1024 * 1024) {
      setError('File too large. Limit: 500 MB')
      setState('error')
      return
    }
    setFile(f)
    setProjectName(f.name.replace(/\.(glb|gltf)$/i, ''))
    setError('')
    setState('selected')
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setState('idle')
      const dropped = e.dataTransfer.files[0]
      if (dropped) acceptFile(dropped)
    },
    [acceptFile],
  )

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setState('dragging')
  }
  const onDragLeave = () => setState('idle')

  const handleUpload = async () => {
    if (!file || !projectName.trim()) return
    setState('uploading')
    setProgress(0)

    try {
      // 1. Get presigned upload URL + create project record
      const initRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName.trim(),
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type || 'model/gltf-binary',
        }),
      })

      if (!initRes.ok) throw new Error('Initialization error')
      const { uploadUrl, projectId } = await initRes.json()

      // 2. Upload file directly to R2 via presigned URL with progress tracking
      await uploadWithProgress(file, uploadUrl, setProgress)

      // 3. Confirm upload completion
      const confirmRes = await fetch(`/api/upload/${projectId}/confirm`, {
        method: 'POST',
      })
      if (!confirmRes.ok) throw new Error('Confirmation error')

      setState('done')
      setTimeout(() => router.push(`/dashboard/project/${projectId}`), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setState('error')
    }
  }

  const reset = () => {
    setState('idle')
    setFile(null)
    setProgress(0)
    setProjectName('')
    setError('')
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1 text-dark-900">New upload</h1>
        <p className="text-dark-700 text-sm">
          Supported formats:{' '}
          <span className="font-mono text-brand-600 font-semibold">.glb</span> /{' '}
          <span className="font-mono text-brand-600 font-semibold">.gltf</span>
          {' '}· Max size: 500 MB
        </p>
      </div>

      {/* Drop zone */}
      {(state === 'idle' || state === 'dragging' || state === 'error') && (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`relative rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-all ${
            state === 'dragging'
              ? 'border-brand-500 bg-brand-50'
              : 'border-surface-300 hover:border-brand-400 hover:bg-surface-50 bg-white'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".glb,.gltf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && acceptFile(e.target.files[0])}
          />
          <div
            className={`w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center transition-colors ${
              state === 'dragging' ? 'bg-brand-100' : 'bg-surface-100'
            }`}
          >
            <Box
              className={`w-8 h-8 transition-colors ${
                state === 'dragging' ? 'text-brand-500' : 'text-dark-700'
              }`}
            />
          </div>
          <p className="font-semibold mb-1 text-dark-900">
            {state === 'dragging'
              ? 'Drop your file here'
              : 'Drag your 3D file here'}
          </p>
          <p className="text-sm text-dark-700">
            or{' '}
            <span className="text-brand-600 underline underline-offset-2">
              click to browse
            </span>
          </p>
          <p className="text-xs text-dark-700 mt-4">GLB · GLTF · Max 500 MB</p>

          {state === 'error' && (
            <div className="mt-5 flex items-center gap-2 text-red-400 text-sm justify-center">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>
      )}

      {/* File selected + form */}
      {(state === 'selected' || state === 'uploading') && file && (
        <div className="space-y-4">
          {/* File preview card */}
          <div className="bg-white border border-surface-200 shadow-sm rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
              <Box className="w-5 h-5 text-brand-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate text-dark-900">{file.name}</p>
              <p className="text-xs text-dark-700 mt-0.5">{formatFileSize(file.size)}</p>
            </div>
            {state === 'selected' && (
              <button onClick={reset} className="text-dark-700 hover:text-dark-900 p-1.5 rounded-lg hover:bg-surface-50 transition-all border border-transparent hover:border-surface-200">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Project name input */}
          <div>
            <label className="block text-sm font-medium text-dark-900 mb-2">
              Project name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              disabled={state === 'uploading'}
              placeholder="e.g. Pump Housing v3 - Assembly"
              className="w-full px-4 py-3 rounded-xl border border-surface-200 bg-white text-dark-900 placeholder:text-dark-700 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all disabled:opacity-50 text-sm shadow-sm"
            />
          </div>

          {/* Progress bar */}
          {state === 'uploading' && (
            <div>
              <div className="flex items-center justify-between text-xs text-dark-700 mb-2">
                <span>Uploading...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Upload button */}
          {state === 'selected' && (
            <button
              onClick={handleUpload}
              disabled={!projectName.trim()}
              className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all shadow-sm"
            >
              <Upload className="w-4 h-4" />
              Upload model
            </button>
          )}
        </div>
      )}

      {/* Success state */}
      {state === 'done' && (
        <div className="text-center py-12 bg-white border border-surface-200 shadow-sm rounded-2xl">
          <CheckCircle2 className="w-16 h-16 text-brand-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2 text-dark-900">Upload successful!</h2>
          <p className="text-dark-700 text-sm">Redirecting to your project...</p>
        </div>
      )}
    </div>
  )
}

// Upload with progress tracking using XMLHttpRequest
function uploadWithProgress(
  file: File,
  url: string,
  onProgress: (n: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', file.type || 'model/gltf-binary')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress((e.loaded / e.total) * 100)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`Upload failed: ${xhr.status}`))
    }
    xhr.onerror = () => reject(new Error('Network error'))
    xhr.send(file)
  })
}
