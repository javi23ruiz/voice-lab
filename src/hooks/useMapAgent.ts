import { useState, useCallback, useRef } from 'react'
import type { RefObject } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import type { Conversation, Message, BaseLayer, OverlayLayer } from '../types'
import { mapTools, buildSystemPrompt, getMarkerSnapshot, layerCallbacks } from '../mapTools'

const generateId = () => Math.random().toString(36).slice(2, 11)

const MODEL = 'claude-sonnet-4-6'
const MAX_ITERATIONS = 10

interface AgentResponse {
  thinking?: string
  tool_call: { name: string; params: Record<string, unknown> } | null
  message: string | null
}

/**
 * Extracts the FIRST complete JSON object from a string by bracket counting.
 * Handles cases where Claude wraps JSON in code fences or emits multiple objects.
 */
function extractJSON(text: string): string {
  const stripped = text
    .replace(/^```json\s*/im, '')
    .replace(/^```\s*/im, '')
    .replace(/```\s*$/im, '')
    .trim()

  // Find the first '{' and match its closing '}'
  const start = stripped.indexOf('{')
  if (start === -1) return stripped

  let depth = 0
  let inString = false
  let escape = false

  for (let i = start; i < stripped.length; i++) {
    const ch = stripped[i]
    if (escape) { escape = false; continue }
    if (ch === '\\' && inString) { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return stripped.slice(start, i + 1)
    }
  }

  return stripped
}

interface LayerCallbackRef {
  current: {
    setBaseLayer: (l: BaseLayer) => void
    toggleOverlay: (o: OverlayLayer, visible: boolean) => void
  }
}

export function useMapAgent(
  mapRef: RefObject<LeafletMap | null>,
  conversation: Conversation,
  onUpdate: (updater: (prev: Conversation) => Conversation) => void,
  layerCallbackRef?: LayerCallbackRef,
) {
  const [isLoading, setIsLoading] = useState(false)
  const abortedRef = useRef(false)
  // Always-fresh ref so async loop can read latest state without stale closure
  const convRef = useRef(conversation)
  convRef.current = conversation

  const updateConversation = useCallback(
    (updater: (prev: Conversation) => Conversation) => {
      onUpdate(prev => {
        const next = updater(prev)
        convRef.current = next
        return next
      })
    },
    [onUpdate],
  )

  /**
   * Replaces the content of the last assistant message.
   */
  const patchLastAssistant = useCallback(
    (content: string, isStreaming: boolean, usage?: { input_tokens: number; output_tokens: number }) => {
      updateConversation(prev => {
        const messages = [...prev.messages]
        for (let i = messages.length - 1; i >= 0; i--) {
          if (messages[i].role === 'assistant') {
            messages[i] = { ...messages[i], content, isStreaming, ...(usage ? { usage } : {}) }
            break
          }
        }
        return { ...prev, messages, updatedAt: new Date() }
      })
    },
    [updateConversation],
  )

  const sendToAgent = useCallback(
    async (userText: string) => {
      if (!userText.trim() || isLoading) return

      const map = mapRef.current
      if (!map) {
        updateConversation(prev => ({
          ...prev,
          messages: [
            ...prev.messages,
            {
              id: generateId(),
              role: 'assistant',
              content: '⚠️ Map is not ready yet. Please try again in a moment.',
              timestamp: new Date(),
            },
          ],
          updatedAt: new Date(),
        }))
        return
      }

      // Bind live layer callbacks so tools can mutate React state
      if (layerCallbackRef) {
        layerCallbacks.setBaseLayer = (layer) => {
          layerCallbackRef.current.setBaseLayer(layer)
          return `Switched base layer to ${layer}`
        }
        layerCallbacks.toggleOverlay = (overlay, visible) => {
          layerCallbackRef.current.toggleOverlay(overlay, visible)
          return `${visible ? 'Enabled' : 'Disabled'} ${overlay} overlay`
        }
      }

      abortedRef.current = false
      setIsLoading(true)

      const userMsg: Message = {
        id: generateId(),
        role: 'user',
        content: userText.trim(),
        timestamp: new Date(),
      }
      const assistantPlaceholder: Message = {
        id: generateId(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        model: MODEL,
        isStreaming: true,
      }

      // Snapshot messages BEFORE appending placeholders — this is the API history base
      const historySnapshot = convRef.current.messages

      updateConversation(prev => ({
        ...prev,
        title:
          prev.messages.length === 0
            ? userText.trim().slice(0, 40) + (userText.length > 40 ? '…' : '')
            : prev.title,
        messages: [...prev.messages, userMsg, assistantPlaceholder],
        updatedAt: new Date(),
      }))

      // Mutable local history for the agent loop — never touches React state
      const apiHistory: { role: string; content: string }[] = [
        ...historySnapshot.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userText.trim() },
      ]

      // The final text shown to the user — only written to state once, after the loop
      let finalContent = '⚠️ Agent completed without a response.'
      // Accumulate usage across all agent loop iterations
      let totalUsage = { input_tokens: 0, output_tokens: 0 }

      try {
        let iterations = 0

        while (iterations < MAX_ITERATIONS && !abortedRef.current) {
          iterations++

          const systemPrompt = buildSystemPrompt(
            map.getZoom(),
            map.getCenter(),
            convRef.current.mapState?.baseLayer,
            convRef.current.mapState?.activeOverlays,
          )

          const res = await fetch('/api/map-agent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: apiHistory, systemPrompt, model: MODEL }),
          })

          if (!res.ok) {
            finalContent = `⚠️ Server error: HTTP ${res.status}`
            break
          }

          const { text, usage } = (await res.json()) as { text: string; usage?: { input_tokens: number; output_tokens: number } }
          if (usage) {
            totalUsage.input_tokens += usage.input_tokens
            totalUsage.output_tokens += usage.output_tokens
          }
          const jsonStr = extractJSON(text)

          let parsed: AgentResponse
          try {
            parsed = JSON.parse(jsonStr) as AgentResponse
          } catch {
            // Claude returned something that isn't JSON — show it as a plain reply
            finalContent = text.trim()
            break
          }

          if (parsed.tool_call) {
            const toolName = parsed.tool_call.name
            const tool = mapTools.find(t => t.name === toolName)

            if (!tool) {
              finalContent = `⚠️ Unknown tool requested: ${toolName}`
              break
            }

            // Execute the tool (may be async, e.g. geolocation)
            const result = await Promise.resolve(tool.execute(parsed.tool_call.params ?? {}, map))

            // Feed the tool interaction back into the local API history and loop
            apiHistory.push({ role: 'assistant', content: jsonStr })
            apiHistory.push({ role: 'user', content: `[Tool result: ${result}]` })

            // Nothing written to React state here — avoids race conditions
          } else if (parsed.message) {
            finalContent = parsed.message
            break
          } else {
            finalContent = 'Done.'
            break
          }
        }

        if (iterations >= MAX_ITERATIONS && !abortedRef.current) {
          finalContent = '⚠️ Agent reached maximum iterations without completing.'
        }
      } catch (err: unknown) {
        if (!abortedRef.current) {
          finalContent = `⚠️ Error: ${err instanceof Error ? err.message : 'Unknown error'}`
        }
      } finally {
        if (!abortedRef.current) {
          // Single state write after the entire loop — no race conditions
          const usageToStore = (totalUsage.input_tokens > 0 || totalUsage.output_tokens > 0) ? totalUsage : undefined
          patchLastAssistant(finalContent, false, usageToStore)
          // Persist marker state after every agent interaction
          const markers = getMarkerSnapshot()
          const map = mapRef.current
          if (map) {
            const { lat, lng } = map.getCenter()
            const zoom = map.getZoom()
            updateConversation(prev => ({
              ...prev,
              mapState: {
                center: [lat, lng],
                zoom,
                markers,
              },
            }))
          }
        }
        setIsLoading(false)
      }
    },
    [isLoading, mapRef, updateConversation, patchLastAssistant],
  )

  const stopAgent = useCallback(() => {
    abortedRef.current = true
    setIsLoading(false)
    updateConversation(prev => ({
      ...prev,
      messages: prev.messages.map(m => ({ ...m, isStreaming: false })),
    }))
  }, [updateConversation])

  return { isLoading, sendToAgent, stopAgent }
}
