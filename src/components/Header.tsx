import { PanelLeftOpen, Sun, Moon } from 'lucide-react'
import type { Conversation } from '../types'

interface Props {
  conversation: Conversation | null
  sidebarOpen: boolean
  activeView: 'chat' | 'analytics' | 'map' | 'landing'
  onExpandSidebar: () => void
  theme: 'dark' | 'light'
  onToggleTheme: () => void
}

export function Header({ conversation, sidebarOpen, activeView, onExpandSidebar, theme, onToggleTheme }: Props) {
  return (
    <header className="flex items-center gap-3 px-6 py-3 border-b section-divider bg-surface-950/50 backdrop-blur-sm">
      {!sidebarOpen && (
        <button
          onClick={onExpandSidebar}
          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/8 transition-colors flex-shrink-0"
          title="Show sidebar"
        >
          <PanelLeftOpen size={15} />
        </button>
      )}
      {activeView === 'chat' && (
        <>
          <span className="text-sm font-medium text-gray-300 truncate max-w-xs">
            {conversation?.title ?? 'New Conversation'}
          </span>
          {conversation && (
            <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-500 border border-white/8">
              {conversation.model}
            </span>
          )}
        </>
      )}

      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/8 transition-colors"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </header>
  )
}
