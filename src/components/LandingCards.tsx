import { Map as MapIcon, MessageSquare } from 'lucide-react'
import { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  r: number
  baseOpacity: number
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
        speed: 0.003 + Math.random() * 0.012,
        phase: Math.random() * Math.PI * 2,
      }))
    }

    function resize() {
      const { offsetWidth: w, offsetHeight: h } = canvas!.parentElement!
      canvas!.width = w
      canvas!.height = h
      seed(w, h)
    }

    function draw(t: number) {
      const w = canvas!.width
      const h = canvas!.height
      ctx!.clearRect(0, 0, w, h)
      for (const s of stars) {
        const osc = Math.sin(t * s.speed + s.phase) * 0.5 + 0.5
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

interface Props {
  theme: 'dark' | 'light'
  onSelectMap: () => void
  onSelectChat: () => void
}

export function LandingCards({ theme, onSelectMap, onSelectChat }: Props) {
  const isDark = theme === 'dark'

  return (
    <div className="relative flex-1 flex flex-col items-center justify-center gap-8 overflow-hidden px-8">
      <StarField isDark={isDark} />

      <div className="relative z-10 text-center">
        <h2 className="text-2xl font-semibold text-gray-100 mb-2">Map AI Assistant</h2>
        <p className="text-sm text-gray-500">Choose how you want to start</p>
      </div>

      <div className="relative z-10 flex gap-6">
        {/* Maps card */}
        <button
          onClick={onSelectMap}
          className="group flex flex-col items-center gap-4 w-52 p-8 rounded-2xl border border-white/10 bg-white/3 hover:bg-accent-500/10 hover:border-accent-500/40 transition-all duration-200 cursor-pointer"
        >
          <div className="w-14 h-14 rounded-2xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center group-hover:bg-accent-500/20 group-hover:border-accent-500/40 transition-all">
            <MapIcon size={28} className="text-accent-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-200 mb-1">Map Assistant</p>
            <p className="text-xs text-gray-500">Explore places with AI</p>
          </div>
        </button>

        {/* Chat card */}
        <button
          onClick={onSelectChat}
          className="group flex flex-col items-center gap-4 w-52 p-8 rounded-2xl border border-white/10 bg-white/3 hover:bg-white/8 hover:border-white/20 transition-all duration-200 cursor-pointer"
        >
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 group-hover:border-white/20 transition-all">
            <MessageSquare size={28} className="text-gray-400 group-hover:text-gray-200 transition-colors" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-200 mb-1">Chat</p>
            <p className="text-xs text-gray-500">Ask anything</p>
          </div>
        </button>
      </div>
    </div>
  )
}
