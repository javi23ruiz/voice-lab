import { useEffect, useRef } from 'react'

interface Star {
  x: number; y: number; r: number
  baseOpacity: number; speed: number; phase: number
}

export function StarField({ isDark }: { isDark: boolean }) {
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
    return () => { cancelAnimationFrame(rafId); ro.disconnect() }
  }, [isDark])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  )
}
