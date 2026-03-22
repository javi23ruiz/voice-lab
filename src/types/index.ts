export type Role = 'user' | 'assistant'

export interface Message {
  id: string
  role: Role
  content: string
  timestamp: Date
  model?: string
  usage?: {
    input_tokens: number
    output_tokens: number
  }
  isStreaming?: boolean
}

export interface MapMarker {
  lat: number
  lng: number
  label: string
}

export type BaseLayer = 'street' | 'satellite' | 'terrain' | 'dark' | 'light'
export type OverlayLayer = 'railways' | 'heatmap'

export interface MapState {
  center: [number, number]
  zoom: number
  markers: MapMarker[]
  baseLayer?: BaseLayer
  activeOverlays?: OverlayLayer[]
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  model: string
  pinned?: boolean
  isMapConversation?: boolean
  mapState?: MapState
  createdAt: Date
  updatedAt: Date
}

export interface ModelInfo {
  id: string
  name: string
  description: string
  badge: string
  badgeColor: 'purple' | 'blue' | 'green'
}

export interface ChatState {
  conversations: Conversation[]
  activeConversationId: string | null
  models: ModelInfo[]
  selectedModel: string
  isLoading: boolean
  streamingContent: string
  systemPrompt: string
}
