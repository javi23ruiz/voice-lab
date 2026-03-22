import { useEffect, useRef, useState, useCallback } from 'react'
import { Bot, ChevronDown } from 'lucide-react'
import { MessageBubble } from './MessageBubble'
import type { Conversation } from '../types'

interface Props {
  conversation: Conversation | null
  isLoading: boolean
  theme: 'dark' | 'light'
  onSend: (content: string) => void
  onRegenerate: () => void
  onEdit: () => void
  suggestions?: string[]
  emptyTitle?: string
  emptyDescription?: string
}

// ─── Starfield canvas ─────────────────────────────────────────────────────────
interface Star {
  x: number
  y: number
  r: number
  baseOpacity: number
  opacity: number
  speed: number
  phase: number
}

function StarField({ isDark }: { isDark: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let rafId: number
    let stars: Star[] = []

    function seed(w: number, h: number) {
      stars = Array.from({ length: 180 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.4 + Math.random() * 1.6,
        baseOpacity: 0.15 + Math.random() * 0.75,
        opacity: 0,
        speed: 0.003 + Math.random() * 0.012,
        phase: Math.random() * Math.PI * 2,
      }))
    }

    function resize() {
      const { offsetWidth: w, offsetHeight: h } = canvas!.parentElement!
      canvas!.width  = w
      canvas!.height = h
      seed(w, h)
    }

    function draw(t: number) {
      const w = canvas!.width
      const h = canvas!.height
      ctx!.clearRect(0, 0, w, h)

      for (const s of stars) {
        const osc = Math.sin(t * s.speed + s.phase) * 0.5 + 0.5   // 0..1
        const alpha = isDark
          ? s.baseOpacity * (0.4 + osc * 0.6)
          : s.baseOpacity * 0.12 * (0.4 + osc * 0.6)

        ctx!.beginPath()
        ctx!.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx!.fillStyle = isDark
          ? `rgba(220,228,255,${alpha})`
          : `rgba(99,102,241,${alpha})`
        ctx!.fill()
      }

      rafId = requestAnimationFrame(draw)
    }

    resize()
    rafId = requestAnimationFrame(draw)

    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement!)

    return () => {
      cancelAnimationFrame(rafId)
      ro.disconnect()
    }
  }, [isDark])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  )
}

// ─── Chat window ──────────────────────────────────────────────────────────────
export function ChatWindow({ conversation, isLoading, theme, onSend, onRegenerate, onEdit, suggestions, emptyTitle, emptyDescription }: Props) {
  const isDark = theme === 'dark'
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const nearBottomRef = useRef(true)

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior })
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    function onScroll() {
      const dist = el!.scrollHeight - el!.scrollTop - el!.clientHeight
      nearBottomRef.current = dist < 120
      setShowScrollBtn(dist > 120)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (nearBottomRef.current) scrollToBottom('smooth')
  }, [conversation?.messages.length, isLoading, scrollToBottom])

  useEffect(() => {
    scrollToBottom('instant')
    setShowScrollBtn(false)
    nearBottomRef.current = true
  }, [conversation?.id, scrollToBottom])

  if (!conversation || conversation.messages.length === 0) {
    return (
      <div className="relative flex-1 flex flex-col items-center justify-center gap-4 text-center px-8 overflow-hidden">
        <StarField isDark={isDark} />
        <div className="relative z-10 w-14 h-14 rounded-2xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center">
          <Bot size={28} className="text-accent-400" />
        </div>
        <div className="relative z-10">
          <h2 className="text-xl font-semibold text-gray-200 mb-1">{emptyTitle ?? 'Voice Model Lab'}</h2>
          <p className="text-sm text-gray-500 max-w-xs">
            {emptyDescription ?? 'Test different Claude models. Voice capabilities coming soon.'}
          </p>
        </div>
        <div className="relative z-10 grid grid-cols-2 gap-2 mt-2">
          {(suggestions ?? SUGGESTIONS).map(s => (
            <button
              key={s}
              onClick={() => onSend(s)}
              className="px-3 py-2 text-xs text-gray-400 rounded-lg border border-white/8 bg-white/3 hover:bg-white/8 hover:text-gray-200 hover:border-white/15 transition-all text-left cursor-pointer"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const msgs = conversation.messages
  const lastNonStreamingIdx = (() => {
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (!msgs[i].isStreaming) return i
    }
    return -1
  })()

  return (
    <div className="relative flex-1 min-h-0">
      <StarField isDark={isDark} />
      <div
        ref={scrollRef}
        className="relative h-full overflow-y-auto py-6 scroll-smooth scrollbar-thin"
        style={{ zIndex: 1 }}
      >
        <div className="max-w-[58rem] mx-auto px-6 space-y-6">
          {msgs.map((msg, i) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isLast={i === lastNonStreamingIdx}
              onRegenerate={onRegenerate}
              onEdit={onEdit}
            />
          ))}
        </div>
        <div ref={bottomRef} />
      </div>

      {showScrollBtn && (
        <button
          onClick={() => scrollToBottom('smooth')}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-800 border border-white/12 text-xs text-gray-300 shadow-lg hover:bg-surface-700 hover:text-white transition-all animate-fade-in"
          style={{ zIndex: 2 }}
        >
          <ChevronDown size={13} />
          Scroll to latest
        </button>
      )}
    </div>
  )
}

const SUGGESTIONS = [
  'Compare writing styles',
  'Explain a concept simply',
  'Brainstorm ideas',
  'Debug my code',
]
