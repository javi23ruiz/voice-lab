import { useEffect, useState, useCallback } from 'react'
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { ChatWindow } from './components/ChatWindow'
import { MessageInput } from './components/MessageInput'
import { ToastProvider } from './components/Toast'
import { AnalyticsDashboard } from './components/AnalyticsDashboard'
import { OpenStreetMapView } from './components/OpenStreetMapView'
import { LandingCards } from './components/LandingCards'
import { useChat } from './hooks/useChat'

export default function App() {
  const {
    conversations,
    activeConversation,
    activeConversationId,
    isLoading,
    systemPrompt,
    setSystemPrompt,
    setActiveConversationId,
    fetchModels,
    deleteConversation,
    renameConversation,
    pinConversation,
    sendMessage,
    stopStreaming,
    removeLastExchange,
    createMapConversation,
    updateConversation,
  } = useChat()

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [prefill, setPrefill] = useState<string>('')
  const [prefillKey, setPrefillKey] = useState(0)
  const [activeView, setActiveView] = useState<'chat' | 'analytics' | 'map' | 'landing'>('landing')
  const [mapConvId, setMapConvId] = useState<string | null>(null)

  const mapConversation = conversations.find(c => c.id === mapConvId) ?? null
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    (localStorage.getItem('theme') as 'dark' | 'light') || 'dark'
  )

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('light', theme === 'light')
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => { fetchModels() }, [fetchModels])

  const handleRegenerate = useCallback(() => {
    const content = removeLastExchange()
    if (content) sendMessage(content)
  }, [removeLastExchange, sendMessage])

  const handleEdit = useCallback(() => {
    const content = removeLastExchange()
    if (content) {
      setPrefill(content)
      setPrefillKey(k => k + 1)
    }
  }, [removeLastExchange])

  return (
    <ToastProvider>
      <div className="flex h-screen bg-surface-900 text-gray-100 overflow-hidden">
        {sidebarOpen && (
          <Sidebar
            conversations={conversations.filter(c => c.messages.length > 0)}
            activeId={activeConversationId}
            systemPrompt={systemPrompt}
            activeView={activeView === 'analytics' ? 'analytics' : 'chat'}
            onNew={() => { setActiveConversationId(null); setActiveView('landing') }}
            onSelect={id => {
              setActiveConversationId(id)
              const conv = conversations.find(c => c.id === id)
              if (conv?.isMapConversation) {
                setMapConvId(id)
                setActiveView('map')
              } else {
                setActiveView('chat')
              }
            }}
            onDelete={deleteConversation}
            onRename={renameConversation}
            onPin={pinConversation}
            onSystemPromptChange={setSystemPrompt}
            onCollapse={() => setSidebarOpen(false)}
            onSetView={setActiveView}
          />
        )}

        <main className="flex flex-col flex-1 min-w-0">
          <Header
            conversation={activeConversation}
            sidebarOpen={sidebarOpen}
            activeView={activeView}
            onExpandSidebar={() => setSidebarOpen(true)}
            theme={theme}
            onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
          />
          {activeView === 'analytics' ? (
            <AnalyticsDashboard conversations={conversations} theme={theme} />
          ) : activeView === 'map' && mapConversation ? (
            <OpenStreetMapView
              key={mapConvId}
              theme={theme}
              conversation={mapConversation}
              onUpdateConversation={updater => updateConversation(mapConvId!, updater)}
            />
          ) : activeView === 'landing' ? (
            <LandingCards
              theme={theme}
              onSelectMap={() => {
                const id = createMapConversation()
                setMapConvId(id)
                setActiveView('map')
              }}
              onSelectChat={() => {
                setActiveConversationId(null)
                setActiveView('chat')
              }}
            />
          ) : (
            <>
              <ChatWindow
                conversation={activeConversation}
                isLoading={isLoading}
                theme={theme}
                onSend={sendMessage}
                onRegenerate={handleRegenerate}
                onEdit={handleEdit}
              />
              <MessageInput
                onSend={sendMessage}
                onStop={stopStreaming}
                isLoading={isLoading}
                prefill={prefill}
                key={prefillKey}
                conversationId={activeConversationId}
              />
            </>
          )}
        </main>
      </div>
    </ToastProvider>
  )
}
