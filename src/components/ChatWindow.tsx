import { useEffect, useRef, useState, useCallback } from 'react'
import { ChevronDown } from 'lucide-react'
import { MessageBubble } from './MessageBubble'
import { IridescentOrb } from './IridescentOrb'
import type { Conversation } from '../types'

interface Props {
  conversation: Conversation | null
  isLoading: boolean
  theme: 'dark' | 'light'
  onSend: (content: string) => void
  onRegenerate: () => void
  onEdit: () => void
  suggestions?: string[]
  chips?: { emoji: string; label: string }[]
  emptyTitle?: string
  emptyDescription?: string
  username?: string
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
export function ChatWindow({ conversation, isLoading, theme, onSend, onRegenerate, onEdit, suggestions, chips, emptyTitle, emptyDescription, username }: Props) {
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
    const resolvedChips = chips
      ?? (suggestions ? suggestions.map(s => ({ emoji: '', label: s })) : DEFAULT_CHIPS)

    const greeting = emptyTitle ?? (username ? `Hey ${username}!` : 'Hey there!')
    const subtitle = emptyDescription ?? 'Ready to assist you with anything you need.'

    return (
      <div className="relative flex-1 flex flex-col items-center justify-center gap-6 text-center px-8 overflow-hidden">
        <StarField isDark={isDark} />

        {/* Radial gradient overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: 1,
            background: isDark
              ? 'radial-gradient(ellipse at center, rgba(120,80,200,0.15) 0%, rgba(100,60,180,0.08) 40%, transparent 70%)'
              : 'radial-gradient(ellipse at center, rgba(190,170,255,0.25) 0%, rgba(170,150,255,0.12) 40%, transparent 70%)',
          }}
        />

        {/* Iridescent orb */}
        <div className="relative z-10">
          <IridescentOrb isDark={isDark} />
        </div>

        {/* Greeting */}
        <div className="relative z-10 space-y-2">
          <h2 className={`text-3xl font-bold leading-tight ${
            isDark ? 'text-gray-100' : 'text-indigo-900'
          }`}>
            {greeting}
            {!emptyTitle && <><br />Can I help you with anything?</>}
          </h2>
          <p className={`text-sm max-w-sm mx-auto ${
            isDark ? 'text-gray-500' : 'text-gray-400'
          }`}>
            {subtitle}
          </p>
        </div>

        {/* Suggestion chips */}
        <div className="relative z-10 flex flex-wrap justify-center gap-2 mt-2 max-w-lg">
          {resolvedChips.map(chip => (
            <button
              key={chip.label}
              onClick={() => onSend(chip.label)}
              className={`px-4 py-2 text-sm rounded-full border transition-all duration-200 cursor-pointer backdrop-blur-sm ${
                isDark
                  ? 'bg-white/[0.08] border-white/[0.12] text-gray-400 hover:bg-white/[0.15] hover:border-white/20 hover:text-gray-200'
                  : 'bg-white/70 border-white/50 text-gray-600 shadow-sm hover:bg-white/90 hover:text-gray-800'
              }`}
            >
              {chip.emoji ? `${chip.emoji}  ${chip.label}` : chip.label}
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
      {/* Radial gradient overlay (consistent with empty state) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          background: isDark
            ? 'radial-gradient(ellipse at center, rgba(120,80,200,0.15) 0%, rgba(100,60,180,0.08) 40%, transparent 70%)'
            : 'radial-gradient(ellipse at center, rgba(190,170,255,0.25) 0%, rgba(170,150,255,0.12) 40%, transparent 70%)',
        }}
      />
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
          className={`absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs shadow-lg transition-all animate-fade-in ${
            isDark
              ? 'bg-surface-800 border border-white/12 text-gray-300 hover:bg-surface-700 hover:text-white'
              : 'bg-white border border-black/10 text-gray-600 hover:bg-surface-50 hover:text-gray-900'
          }`}
          style={{ zIndex: 2 }}
        >
          <ChevronDown size={13} />
          Scroll to latest
        </button>
      )}
    </div>
  )
}

const DEFAULT_CHIPS = [
  { emoji: '\u{1F5FA}\uFE0F', label: 'Explore a place' },
  { emoji: '\u2728', label: 'Surprise Me' },
  { emoji: '\u{1F4A1}', label: 'Get Advice' },
  { emoji: '\u{1F9E0}', label: 'Brainstorm' },
  { emoji: '\u{1F4CA}', label: 'Analyze Data' },
]
