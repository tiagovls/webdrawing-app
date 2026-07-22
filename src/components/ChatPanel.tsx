import React, { useState, useEffect, useRef } from 'react'
import { Send, User, MessageCircle } from 'lucide-react'

interface MeshItem {
  name: string
  uuid: string
}

interface ChatMessage {
  id: string
  text: string
  author: string
  createdAt: string
}

interface ChatPanelProps {
  shareLinkId: string
  meshList: MeshItem[]
  onMeshSelect: (uuid: string) => void
}

export function ChatPanel({ shareLinkId, meshList, onMeshSelect }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [author, setAuthor] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Autocomplete state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionIndex, setMentionIndex] = useState(-1) // char index where @ started
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/chat/${shareLinkId}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data)
      }
    } catch (e) {
      console.error(e)
    }
  }

  // Initial fetch + Polling
  useEffect(() => {
    fetchMessages()
    const interval = setInterval(fetchMessages, 3000)
    return () => clearInterval(interval)
  }, [shareLinkId])

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || isSubmitting) return
    setIsSubmitting(true)
    
    // Optimistic update
    const tempId = `temp-${Date.now()}`
    const newMessage = { id: tempId, text: text.trim(), author: author.trim() || 'Anonymous', createdAt: new Date().toISOString() }
    setMessages(prev => [...prev, newMessage])
    setText('')
    setMentionQuery(null)
    
    try {
      await fetch(`/api/chat/${shareLinkId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newMessage.text, author: newMessage.author })
      })
      // The polling will pick up the real message and replace the optimistic one
      fetchMessages()
    } catch (e) {
      console.error(e)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setText(val)

    // Detect @ mention typing
    const cursor = e.target.selectionStart
    const textBeforeCursor = val.slice(0, cursor)
    const match = textBeforeCursor.match(/@([\w-]*)$/)
    
    if (match) {
      setMentionQuery(match[1].toLowerCase())
      setMentionIndex(match.index!)
    } else {
      setMentionQuery(null)
    }
  }

  const insertMention = (meshName: string) => {
    if (mentionIndex === -1) return
    const before = text.slice(0, mentionIndex)
    const after = text.slice(textareaRef.current?.selectionStart || text.length)
    // Avoid spaces in mentions, but if name has spaces, replace them or just wrap in something?
    // Let's just remove spaces for the mention tag, e.g. @Plaque_Avant
    const formattedName = meshName.replace(/\s+/g, '_')
    const newText = `${before}@${formattedName} ${after}`
    setText(newText)
    setMentionQuery(null)
    textareaRef.current?.focus()
  }

  const filteredMeshes = mentionQuery !== null 
    ? meshList.filter(m => m.name.toLowerCase().includes(mentionQuery) || m.name.replace(/\s+/g, '_').toLowerCase().includes(mentionQuery)).slice(0, 5)
    : []

  // Function to render text with clickable mentions
  const renderMessageText = (msgText: string) => {
    const parts = msgText.split(/(@\w+)/g)
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const nameMatch = part.slice(1) // remove @
        // Find if this name matches a mesh (with spaces replaced by _)
        const mesh = meshList.find(m => m.name.replace(/\s+/g, '_') === nameMatch || m.name === nameMatch)
        if (mesh) {
          return (
            <span 
              key={i} 
              onClick={() => onMeshSelect(mesh.uuid)}
              className="text-brand-600 font-bold cursor-pointer hover:underline bg-brand-50 px-1 rounded-sm"
              title="Click to select part"
            >
              {part}
            </span>
          )
        }
        return <span key={i} className="text-brand-600 font-semibold">{part}</span>
      }
      return <span key={i}>{part}</span>
    })
  }

  return (
    <div className="flex flex-col h-full bg-surface-50 relative min-w-0 w-full">
      <div className="flex-1 overflow-y-auto p-3 space-y-3 relative min-w-0">
        {messages.length === 0 ? (
          <div className="text-center py-10 text-dark-500 text-sm">
            <MessageCircle className="w-8 h-8 mx-auto mb-3 opacity-30 text-dark-400" />
            <p>No messages</p>
            <p className="text-xs mt-1">Start chatting! Type @ to mention a part.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="bg-white p-3 rounded-xl shadow-sm border border-surface-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-dark-500 flex items-center gap-1 uppercase tracking-wider">
                  <User className="w-3 h-3" />
                  {msg.author}
                </span>
                <span className="text-[9px] text-dark-400">
                  {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
              <p className="text-sm text-dark-900 leading-relaxed break-all whitespace-pre-wrap">
                {renderMessageText(msg.text)}
              </p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-white border-t border-surface-200 relative">
        {/* Autocomplete dropdown */}
        {mentionQuery !== null && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-white rounded-xl shadow-lg border border-surface-200 overflow-hidden z-50">
            <div className="bg-surface-50 px-3 py-1.5 border-b border-surface-200 text-xs font-bold text-dark-500 uppercase">
              Mention a part
            </div>
            {filteredMeshes.length > 0 ? (
              filteredMeshes.map(mesh => (
                <button
                  key={mesh.uuid}
                  type="button"
                  onClick={() => insertMention(mesh.name)}
                  className="w-full text-left px-3 py-2 text-sm text-dark-900 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                >
                  {mesh.name}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-dark-400">No parts found</div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            placeholder="Write a message... (type @ to mention a part)"
            className="w-full text-sm p-2.5 rounded-xl border border-surface-200 bg-surface-50 focus:bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 resize-none h-20"
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={author}
              onChange={e => setAuthor(e.target.value)}
              placeholder="Your name"
              className="flex-1 min-w-0 text-sm px-3 py-2 rounded-lg border border-surface-200 bg-surface-50 focus:bg-white focus:outline-none focus:border-brand-500"
            />
            <button
              type="submit"
              disabled={!text.trim() || isSubmitting}
              className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center justify-center transition-colors"
              title="Envoyer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
