import { useState, useCallback, useRef, useEffect } from 'react'
import type { Conversation, Message, ModelInfo } from '../types'

const generateId = () => Math.random().toString(36).slice(2, 11)

const DEFAULT_MODEL = 'claude-opus-4-6'
const DEFAULT_SYSTEM = 'You are a helpful, thoughtful assistant. Format responses using markdown when appropriate.'
const STORAGE_KEY = 'chatbot_conversations'
const MAP_CONV_LEGACY_KEY = 'map_agent_conversation'

function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Conversation[]
    // Revive Date strings back to Date objects
    return parsed.map(c => ({
      ...c,
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt),
      messages: c.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })),
    }))
  } catch {
    return []
  }
}

function saveConversations(convs: Conversation[]) {
  try {
    // Don't persist empty or mid-stream conversations
    const clean = convs
      .filter(c => c.messages.length > 0)
      .map(c => ({
        ...c,
        messages: c.messages.map(m => ({ ...m, isStreaming: false })),
      }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean))
  } catch {
    // quota exceeded or private mode — silently skip
  }
}

export function useChat() {
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)

  // Persist to localStorage whenever conversations change
  useEffect(() => {
    saveConversations(conversations)
  }, [conversations])
  const [models, setModels] = useState<ModelInfo[]>([])
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL)
  const [isLoading, setIsLoading] = useState(false)
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM)
  const abortRef = useRef<AbortController | null>(null)

  const activeConversation = conversations.find(c => c.id === activeConversationId) ?? null

  // Load models from server
  const fetchModels = useCallback(async () => {
    try {
      const res = await fetch('/api/models')
      const data = await res.json()
      setModels(data.models)
    } catch {
      // Fallback models if server is unavailable
      setModels([
        { id: 'claude-opus-4-6',   name: 'Claude Opus 4.6',   description: 'Most intelligent', badge: 'Most Powerful', badgeColor: 'purple' },
        { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', description: 'Balanced',          badge: 'Balanced',     badgeColor: 'blue'   },
        { id: 'claude-haiku-4-5',  name: 'Claude Haiku 4.5',  description: 'Fastest',           badge: 'Fastest',      badgeColor: 'green'  },
      ])
    }
  }, [])

  const createConversation = useCallback(() => {
    const conv: Conversation = {
      id: generateId(),
      title: 'New Chat',
      messages: [],
      model: selectedModel,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setConversations(prev => [conv, ...prev])
    setActiveConversationId(conv.id)
    return conv.id
  }, [selectedModel])

  const deleteConversation = useCallback((id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id))
    setActiveConversationId(prev => (prev === id ? null : prev))
  }, [])

  const updateConversationTitle = useCallback((id: string, title: string) => {
    setConversations(prev =>
      prev.map(c => (c.id === id ? { ...c, title } : c))
    )
  }, [])

  const renameConversation = useCallback((id: string, title: string) => {
    setConversations(prev =>
      prev.map(c => (c.id === id ? { ...c, title: title.trim() || c.title } : c))
    )
  }, [])

  const pinConversation = useCallback((id: string) => {
    setConversations(prev =>
      prev.map(c => (c.id === id ? { ...c, pinned: !c.pinned } : c))
    )
  }, [])

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return

      let convId = activeConversationId
      if (!convId) {
        convId = createConversation()
      }

      const userMsg: Message = {
        id: generateId(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      }

      const assistantMsg: Message = {
        id: generateId(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        model: selectedModel,
        isStreaming: true,
      }

      // Append user + placeholder assistant message
      setConversations(prev =>
        prev.map(c =>
          c.id === convId
            ? {
                ...c,
                messages: [...c.messages, userMsg, assistantMsg],
                updatedAt: new Date(),
              }
            : c,
        ),
      )

      setIsLoading(true)
      abortRef.current = new AbortController()

      // Build messages array for API (exclude streaming placeholder)
      const conv = conversations.find(c => c.id === convId)
      const history = (conv?.messages ?? []).map(m => ({
        role: m.role,
        content: m.content,
      }))
      history.push({ role: 'user', content: content.trim() })

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: history,
            model: selectedModel,
            system: systemPrompt,
          }),
          signal: abortRef.current.signal,
        })

        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        if (!res.body) throw new Error('No response body')

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let accumulated = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const jsonStr = line.slice(6)
            try {
              const event = JSON.parse(jsonStr)
              if (event.type === 'delta') {
                accumulated += event.text
                setConversations(prev =>
                  prev.map(c =>
                    c.id === convId
                      ? {
                          ...c,
                          messages: c.messages.map(m =>
                            m.id === assistantMsg.id
                              ? { ...m, content: accumulated }
                              : m,
                          ),
                        }
                      : c,
                  ),
                )
              } else if (event.type === 'done') {
                setConversations(prev =>
                  prev.map(c =>
                    c.id === convId
                      ? {
                          ...c,
                          messages: c.messages.map(m =>
                            m.id === assistantMsg.id
                              ? { ...m, isStreaming: false, usage: event.usage }
                              : m,
                          ),
                        }
                      : c,
                  ),
                )
              }
            } catch {
              // ignore parse errors for incomplete chunks
            }
          }
        }

        // Auto-title after first exchange
        if (!conv || conv.messages.length === 0) {
          const title =
            content.trim().slice(0, 40) + (content.length > 40 ? '…' : '')
          updateConversationTitle(convId, title)
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return
        setConversations(prev =>
          prev.map(c =>
            c.id === convId
              ? {
                  ...c,
                  messages: c.messages.map(m =>
                    m.id === assistantMsg.id
                      ? {
                          ...m,
                          content: '⚠️ Failed to get a response. Make sure the server is running and your API key is set.',
                          isStreaming: false,
                        }
                      : m,
                  ),
                }
              : c,
          ),
        )
      } finally {
        setIsLoading(false)
        abortRef.current = null
      }
    },
    [activeConversationId, conversations, createConversation, isLoading, selectedModel, systemPrompt, updateConversationTitle],
  )

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
    setIsLoading(false)
    // Mark any streaming messages as done
    setConversations(prev =>
      prev.map(c => ({
        ...c,
        messages: c.messages.map(m => ({ ...m, isStreaming: false })),
      })),
    )
  }, [])

  // Remove the last user+assistant exchange and return the user's content
  const removeLastExchange = useCallback((): string | null => {
    if (!activeConversationId) return null
    const conv = conversations.find(c => c.id === activeConversationId)
    if (!conv) return null
    const msgs = conv.messages
    let lastUserIdx = -1
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') { lastUserIdx = i; break }
    }
    if (lastUserIdx === -1) return null
    const content = msgs[lastUserIdx].content
    setConversations(prev =>
      prev.map(c =>
        c.id === activeConversationId ? { ...c, messages: msgs.slice(0, lastUserIdx) } : c
      )
    )
    return content
  }, [activeConversationId, conversations])

  const clearConversation = useCallback(() => {
    if (!activeConversationId) return
    setConversations(prev =>
      prev.map(c => (c.id === activeConversationId ? { ...c, messages: [] } : c)),
    )
  }, [activeConversationId])

  // Returns the ID of the persistent Map Assistant conversation, creating it if needed.
  // Also cleans up the legacy standalone localStorage key.
  const getOrCreateMapConversation = useCallback((): string => {
    localStorage.removeItem(MAP_CONV_LEGACY_KEY)
    let mapConv = conversations.find(c => c.isMapConversation)
    if (mapConv) return mapConv.id
    mapConv = {
      id: generateId(),
      title: 'Map Assistant',
      messages: [],
      model: 'claude-sonnet-4-6',
      isMapConversation: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setConversations(prev => [...prev, mapConv!])
    return mapConv.id
  }, [conversations])

  // Always creates a fresh Map Assistant conversation (new session every time).
  const createMapConversation = useCallback((): string => {
    localStorage.removeItem(MAP_CONV_LEGACY_KEY)
    const mapConv: Conversation = {
      id: generateId(),
      title: 'Map Assistant',
      messages: [],
      model: 'claude-sonnet-4-6',
      isMapConversation: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setConversations(prev => [...prev, mapConv])
    return mapConv.id
  }, [])

  // Generic updater for any conversation by ID — used by useMapAgent to push messages.
  const updateConversation = useCallback(
    (id: string, updater: (prev: Conversation) => Conversation) => {
      setConversations(prev => prev.map(c => (c.id === id ? updater(c) : c)))
    },
    [],
  )

  return {
    conversations,
    activeConversation,
    activeConversationId,
    models,
    selectedModel,
    isLoading,
    systemPrompt,
    setSystemPrompt,
    setSelectedModel,
    setActiveConversationId,
    fetchModels,
    createConversation,
    deleteConversation,
    renameConversation,
    pinConversation,
    sendMessage,
    stopStreaming,
    clearConversation,
    removeLastExchange,
    getOrCreateMapConversation,
    createMapConversation,
    updateConversation,
  }
}
