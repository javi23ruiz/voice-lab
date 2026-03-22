import { Plus, MessageSquare, Map as MapIcon, Settings, MoreHorizontal, Pencil, Pin, PinOff, Trash2, Search, X, PanelLeftClose, BarChart2 } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import type { Conversation } from '../types'

interface Props {
  conversations: Conversation[]
  activeId: string | null
  systemPrompt: string
  activeView: 'chat' | 'analytics'
  onNew: () => void
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => void
  onPin: (id: string) => void
  onSystemPromptChange: (v: string) => void
  onCollapse: () => void
  onSetView: (view: 'chat' | 'analytics' | 'map' | 'landing') => void
}

function getDateLabel(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86_400_000)
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  if (d.getTime() === today.getTime()) return 'Today'
  if (d.getTime() === yesterday.getTime()) return 'Yesterday'
  const daysAgo = Math.floor((today.getTime() - d.getTime()) / 86_400_000)
  if (daysAgo < 7) return 'This week'
  return date.toLocaleDateString([], { month: 'long', year: 'numeric' })
}

function groupByDate(convs: Conversation[]) {
  const map = new Map<string, Conversation[]>()
  for (const c of convs) {
    const label = getDateLabel(c.updatedAt)
    if (!map.has(label)) map.set(label, [])
    map.get(label)!.push(c)
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }))
}

export function Sidebar({
  conversations,
  activeId,
  systemPrompt,
  activeView,
  onNew,
  onSelect,
  onDelete,
  onRename,
  onPin,
  onSystemPromptChange,
  onCollapse,
  onSetView,
}: Props) {
  const [showSettings, setShowSettings] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? conversations.filter(c => c.title.toLowerCase().includes(search.toLowerCase()))
    : conversations

  const pinned = filtered.filter(c => c.pinned)
  const unpinned = filtered.filter(c => !c.pinned)
  const groups = groupByDate(unpinned)

  return (
    <aside className="flex flex-col w-64 bg-surface-950 sidebar-edge h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b section-divider">
        <div className="flex items-center gap-2">
          <button
            onClick={onCollapse}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/8 transition-colors"
            title="Collapse sidebar"
          >
            <PanelLeftClose size={15} />
          </button>
          <h1 className="font-semibold text-gray-100 tracking-tight">Voice Lab</h1>
        </div>
        <button
          onClick={onNew}
          className="p-1.5 rounded-lg hover:bg-white/8 text-gray-400 hover:text-gray-200 transition-colors"
          title="New chat"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b section-divider">
        <div className="flex items-center gap-2 bg-white/5 rounded-lg px-2.5 py-1.5">
          <Search size={12} className="text-gray-500 flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations…"
            className="flex-1 text-xs bg-transparent text-gray-300 placeholder-gray-500 outline-none min-w-0"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-gray-600 hover:text-gray-400 transition-colors">
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2 scrollbar-thin">
        {filtered.length === 0 ? (
          <p className="text-xs text-gray-600 text-center mt-8 px-4">
            {search ? 'No conversations match your search' : 'Start a new conversation'}
          </p>
        ) : (
          <>
            {/* Pinned section */}
            {pinned.length > 0 && (
              <>
                <SectionLabel label="Pinned" />
                {pinned.map(conv => (
                  <ConversationItem
                    key={conv.id}
                    conv={conv}
                    active={conv.id === activeId}
                    onSelect={() => onSelect(conv.id)}
                    onDelete={() => onDelete(conv.id)}
                    onRename={title => onRename(conv.id, title)}
                    onPin={() => onPin(conv.id)}
                  />
                ))}
              </>
            )}

            {/* Date-grouped unpinned */}
            {groups.map(({ label, items }) => (
              <div key={label}>
                <SectionLabel label={label} />
                {items.map(conv => (
                  <ConversationItem
                    key={conv.id}
                    conv={conv}
                    active={conv.id === activeId}
                    onSelect={() => onSelect(conv.id)}
                    onDelete={() => onDelete(conv.id)}
                    onRename={title => onRename(conv.id, title)}
                    onPin={() => onPin(conv.id)}
                  />
                ))}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Analytics */}
      <div className="border-t section-divider">
        <button
          onClick={() => onSetView(activeView === 'analytics' ? 'chat' : 'analytics')}
          className={`w-full flex items-center gap-2 px-4 py-3 text-sm transition-colors ${
            activeView === 'analytics'
              ? 'text-accent-400 bg-accent-500/10'
              : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
          }`}
        >
          <BarChart2 size={14} />
          <span>Analytics</span>
        </button>
      </div>

      {/* Settings */}
      <div className="border-t section-divider">
        <button
          onClick={() => setShowSettings(v => !v)}
          className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors"
        >
          <Settings size={14} />
          <span>System Prompt</span>
        </button>

        {showSettings && (
          <div className="px-3 pb-3 animate-fade-in">
            <textarea
              value={systemPrompt}
              onChange={e => onSystemPromptChange(e.target.value)}
              rows={4}
              className="w-full text-xs bg-surface-900 border border-white/10 rounded-lg px-3 py-2 text-gray-300 placeholder-gray-500 resize-none focus:outline-none focus:border-accent-500/50 transition-colors"
              placeholder="System prompt…"
            />
          </div>
        )}
      </div>
    </aside>
  )
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="text-[10px] uppercase tracking-widest text-gray-500 px-2 pt-2 pb-0.5 select-none">
      {label}
    </p>
  )
}

function ConversationItem({
  conv,
  active,
  onSelect,
  onDelete,
  onRename,
  onPin,
}: {
  conv: Conversation
  active: boolean
  onSelect: () => void
  onDelete: () => void
  onRename: (title: string) => void
  onPin: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(conv.title)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [menuOpen])

  useEffect(() => {
    if (renaming) {
      setRenameValue(conv.title)
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [renaming, conv.title])

  function commitRename() {
    onRename(renameValue)
    setRenaming(false)
  }

  return (
    <div
      onClick={() => { if (!renaming) onSelect() }}
      className={`group relative flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors ${
        active ? 'bg-accent-500/15 text-gray-100' : 'text-gray-300 hover:bg-white/5 hover:text-gray-100'
      }`}
    >
      {conv.isMapConversation
        ? <MapIcon size={13} className="flex-shrink-0 text-accent-400" />
        : <MessageSquare size={13} className="flex-shrink-0" />
      }

      {renaming ? (
        <input
          ref={inputRef}
          value={renameValue}
          onChange={e => setRenameValue(e.target.value)}
          onBlur={commitRename}
          onKeyDown={e => {
            if (e.key === 'Enter') commitRename()
            if (e.key === 'Escape') setRenaming(false)
          }}
          onClick={e => e.stopPropagation()}
          className="flex-1 text-xs bg-white/10 rounded px-1.5 py-0.5 text-gray-100 outline-none border border-accent-500/50 min-w-0"
        />
      ) : (
        <span className="flex-1 text-xs truncate">{conv.title}</span>
      )}

      {!renaming && (
        <div ref={menuRef} className="relative">
          <button
            onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 transition-all"
            title="Options"
          >
            <MoreHorizontal size={13} />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-6 z-50 w-40 bg-surface-900 border border-white/10 rounded-lg shadow-xl py-1 animate-fade-in"
              onClick={e => e.stopPropagation()}
            >
              <MenuItem
                icon={<Pencil size={12} />}
                label="Rename"
                onClick={() => { setMenuOpen(false); setRenaming(true) }}
              />
              <MenuItem
                icon={conv.pinned ? <PinOff size={12} /> : <Pin size={12} />}
                label={conv.pinned ? 'Unpin' : 'Pin chat'}
                onClick={() => { setMenuOpen(false); onPin() }}
              />
              <div className="my-1 border-t border-white/8" />
              <MenuItem
                icon={<Trash2 size={12} />}
                label="Delete"
                danger
                onClick={() => { setMenuOpen(false); onDelete() }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MenuItem({
  icon, label, danger, onClick,
}: {
  icon: React.ReactNode
  label: string
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs transition-colors ${
        danger ? 'text-red-400 hover:bg-red-500/10' : 'text-gray-300 hover:bg-white/8'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
