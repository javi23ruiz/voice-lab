import { useEffect, useRef } from 'react'
import { Map as MapIcon, MessageSquare } from 'lucide-react'
import { initGlobe } from './Globe'

interface Props {
  theme: 'dark' | 'light'
  onSelectMap: () => void
  onSelectChat: () => void
}

export function LandingCards({ theme, onSelectMap, onSelectChat }: Props) {
  const isDark = theme === 'dark'
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    const cleanup = initGlobe(canvasRef.current)
    return cleanup
  }, [])

  return (
    <div className="relative flex-1 flex flex-col items-center justify-center gap-8 overflow-hidden px-8">
      {/* Globe background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] opacity-15 pointer-events-auto">
          <canvas ref={canvasRef} style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
        </div>
      </div>

      <div className="relative z-10 text-center">
        <h2 className={`text-2xl font-semibold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Map AI Assistant</h2>
        <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Choose how you want to start</p>
      </div>

      <div className="relative z-10 flex gap-6">
        {/* Maps card */}
        <button
          onClick={onSelectMap}
          className={`group flex flex-col items-center gap-4 w-52 p-8 rounded-2xl border transition-all duration-200 cursor-pointer backdrop-blur-sm ${
            isDark
              ? 'border-white/10 bg-white/3 hover:bg-accent-500/10 hover:border-accent-500/40'
              : 'border-black/8 bg-white/60 hover:bg-accent-500/10 hover:border-accent-500/40'
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center group-hover:bg-accent-500/20 group-hover:border-accent-500/40 transition-all">
            <MapIcon size={28} className="text-accent-400" />
          </div>
          <div className="text-center">
            <p className={`text-sm font-medium mb-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Map Assistant</p>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Explore places with AI</p>
          </div>
        </button>

        {/* Chat card */}
        <button
          onClick={onSelectChat}
          className={`group flex flex-col items-center gap-4 w-52 p-8 rounded-2xl border transition-all duration-200 cursor-pointer backdrop-blur-sm ${
            isDark
              ? 'border-white/10 bg-white/3 hover:bg-white/8 hover:border-white/20'
              : 'border-black/8 bg-white/60 hover:bg-white/80 hover:border-black/15'
          }`}
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
            isDark
              ? 'bg-white/5 border border-white/10 group-hover:bg-white/10 group-hover:border-white/20'
              : 'bg-black/5 border border-black/8 group-hover:bg-black/10 group-hover:border-black/15'
          }`}>
            <MessageSquare size={28} className={`transition-colors ${
              isDark ? 'text-gray-400 group-hover:text-gray-200' : 'text-gray-500 group-hover:text-gray-700'
            }`} />
          </div>
          <div className="text-center">
            <p className={`text-sm font-medium mb-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Chat</p>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Ask anything</p>
          </div>
        </button>
      </div>
    </div>
  )
}
