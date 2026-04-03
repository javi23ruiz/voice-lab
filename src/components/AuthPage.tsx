import { useState, useRef, useEffect } from 'react'
import {
  Map as MapIcon,
  Eye, EyeOff, Loader2,
  MessageSquare, Globe, BarChart2, Layers, Zap, Bot,
} from 'lucide-react'
import { StarField } from './StarField'
import { initGlobe } from './Globe'

interface Props {
  onLogin: (username: string, password: string) => Promise<boolean>
  onRegister: (username: string, password: string) => Promise<boolean>
  error: string | null
  onClearError: () => void
}

type Tab = 'signin' | 'signup'

const FEATURES = [
  { icon: MessageSquare, label: 'AI-powered map conversations' },
  { icon: Globe,         label: 'Interactive map exploration' },
  { icon: Bot,           label: 'Multiple Claude AI models' },
  { icon: BarChart2,     label: 'Analytics dashboard' },
  { icon: Layers,        label: 'Multi-layer map overlays' },
  { icon: Zap,           label: 'Real-time streaming responses' },
]

export function AuthPage({ onLogin, onRegister, error, onClearError }: Props) {
  const isDark = (localStorage.getItem('theme') ?? 'dark') === 'dark'
  const globeCanvasRef = useRef<HTMLCanvasElement>(null)
  const [tab, setTab] = useState<Tab>('signin')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const usernameRef = useRef<HTMLInputElement>(null)

  useEffect(() => { usernameRef.current?.focus() }, [tab])

  useEffect(() => {
    if (!globeCanvasRef.current) return
    return initGlobe(globeCanvasRef.current)
  }, [])

  function switchTab(t: Tab) {
    setTab(t)
    setUsername('')
    setPassword('')
    setConfirm('')
    setLocalError(null)
    onClearError()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLocalError(null)
    onClearError()

    if (tab === 'signup') {
      if (password !== confirm) { setLocalError('Passwords do not match'); return }
      if (password.length < 6) { setLocalError('Password must be at least 6 characters'); return }
    }

    setSubmitting(true)
    try {
      await (tab === 'signin'
        ? onLogin(username.trim(), password)
        : onRegister(username.trim(), password))
    } finally {
      setSubmitting(false)
    }
  }

  const displayError = localError ?? error

  return (
    <div className={`relative flex h-screen w-full overflow-hidden ${isDark ? 'bg-surface-950' : 'bg-surface-50'}`}>
      <StarField isDark={isDark} />

      {/* ── Left column — Branding + Features (~25%) ── */}
      <div className="hidden md:flex relative z-10 w-1/4 flex-col justify-center pl-10 lg:pl-16 pr-6 gap-10">
        {/* Branding */}
        <div className="flex flex-col gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            isDark ? 'bg-accent-500/15 border border-accent-500/30' : 'bg-accent-500/10 border border-accent-500/20'
          }`}>
            <MapIcon size={24} className="text-accent-400" />
          </div>
          <div>
            <h1 className={`text-2xl font-semibold tracking-tight ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
              Map AI Assistant
            </h1>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Your intelligent map companion
            </p>
          </div>
        </div>

        {/* Feature bullets */}
        <ul className="flex flex-col gap-3">
          {FEATURES.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-3">
              <span className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${
                isDark ? 'bg-accent-500/10 border border-accent-500/20' : 'bg-accent-500/8 border border-accent-500/15'
              }`}>
                <Icon size={14} className="text-accent-400" />
              </span>
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Center column — Auth card (~40%) ── */}
      <div className="relative z-10 flex w-full md:w-2/5 items-center justify-center px-6">
        <div className={`w-full max-w-sm rounded-2xl border shadow-2xl ${
          isDark
            ? 'bg-surface-900/80 border-white/10 backdrop-blur-xl'
            : 'bg-white/90 border-black/8 backdrop-blur-xl'
        }`}>

          {/* Tab switcher */}
          <div className={`mx-5 mt-5 mb-4 flex rounded-xl p-1 ${isDark ? 'bg-surface-800' : 'bg-surface-100'}`}>
            {(['signin', 'signup'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
                  tab === t
                    ? isDark
                      ? 'bg-surface-700 text-gray-100 shadow-sm'
                      : 'bg-white text-gray-900 shadow-sm'
                    : isDark
                      ? 'text-gray-500 hover:text-gray-300'
                      : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {t === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-3">
            {/* Username */}
            <div className="space-y-1.5">
              <label className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Username
              </label>
              <input
                ref={usernameRef}
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                required
                placeholder="your_username"
                className={`w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-colors border ${
                  isDark
                    ? 'bg-surface-800 border-white/8 text-gray-100 placeholder-gray-600 focus:border-accent-500/50 focus:bg-surface-700'
                    : 'bg-surface-50 border-black/8 text-gray-900 placeholder-gray-400 focus:border-accent-500/50 focus:bg-white'
                }`}
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
                  required
                  placeholder="••••••••"
                  className={`w-full rounded-xl px-3.5 py-2.5 pr-10 text-sm outline-none transition-colors border ${
                    isDark
                      ? 'bg-surface-800 border-white/8 text-gray-100 placeholder-gray-600 focus:border-accent-500/50 focus:bg-surface-700'
                      : 'bg-surface-50 border-black/8 text-gray-900 placeholder-gray-400 focus:border-accent-500/50 focus:bg-white'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${isDark ? 'text-gray-600 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Confirm password (sign up only) */}
            {tab === 'signup' && (
              <div className="space-y-1.5">
                <label className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    required
                    placeholder="••••••••"
                    className={`w-full rounded-xl px-3.5 py-2.5 pr-10 text-sm outline-none transition-colors border ${
                      isDark
                        ? 'bg-surface-800 border-white/8 text-gray-100 placeholder-gray-600 focus:border-accent-500/50 focus:bg-surface-700'
                        : 'bg-surface-50 border-black/8 text-gray-900 placeholder-gray-400 focus:border-accent-500/50 focus:bg-white'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${isDark ? 'text-gray-600 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            )}

            {/* Error */}
            {displayError && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {displayError}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !username.trim() || !password}
              className="w-full mt-1 flex items-center justify-center gap-2 rounded-xl bg-accent-500 hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 transition-all duration-200 shadow-lg shadow-accent-500/20"
            >
              {submitting ? (
                <><Loader2 size={14} className="animate-spin" /> {tab === 'signin' ? 'Signing in...' : 'Creating account...'}</>
              ) : (
                tab === 'signin' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>
        </div>
      </div>

      {/* ── Right column — 3D Earth (~35%) ── */}
      <div className="hidden md:flex relative z-10 w-[35%] items-center justify-center">
        {/* Subtle radial glow behind the globe */}
        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none`}>
          <div className={`w-[520px] h-[520px] rounded-full blur-3xl opacity-20 ${
            isDark ? 'bg-blue-500' : 'bg-blue-400'
          }`} />
        </div>
        <div className="w-[480px] h-[480px]">
          <canvas ref={globeCanvasRef} style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
        </div>
      </div>
    </div>
  )
}
