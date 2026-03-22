import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useRef, useState, useCallback, useEffect } from 'react'
import L from 'leaflet'
import 'leaflet.heat'
import { BookOpen, X } from 'lucide-react'
import type { Map as LeafletMap } from 'leaflet'
import type { Conversation, BaseLayer, OverlayLayer } from '../types'
import { ChatWindow } from './ChatWindow'
import { MessageInput } from './MessageInput'
import { LayerControlPanel } from './LayerControlPanel'
import { useMapAgent } from '../hooks/useMapAgent'
import { restoreMarkers, markerRegistry } from '../mapTools'

interface Props {
  theme: 'dark' | 'light'
  conversation: Conversation
  onUpdateConversation: (updater: (prev: Conversation) => Conversation) => void
}

// ─── Tile provider config ─────────────────────────────────────────────────────
const TILE_LAYERS: Record<BaseLayer, { url: string; attribution: string; maxZoom?: number }> = {
  street: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com">Esri</a>, DigitalGlobe, GeoEye, Earthstar Geographics',
    maxZoom: 19,
  },
  terrain: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com">Esri</a>, HERE, Garmin, FAO, NOAA, USGS',
    maxZoom: 19,
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
}

// ─── Command reference ────────────────────────────────────────────────────────
const COMMAND_GROUPS: { label: string; commands: { term: string; examples: string }[] }[] = [
  {
    label: 'Zoom',
    commands: [
      { term: 'zoom_in',          examples: '"zoom in", "get closer", "more detail"' },
      { term: 'zoom_out',         examples: '"zoom out", "pull back", "wider view"' },
      { term: 'zoom_to_level',    examples: '"zoom to level 12", "street level", "city view"' },
      { term: 'zoom_to_location', examples: '"zoom to Paris", "show me New York"' },
      { term: 'zoom_to_fit',      examples: '"fit Tokyo and Sydney in view"' },
      { term: 'reset_view',       examples: '"reset", "go home", "default view"' },
    ],
  },
  {
    label: 'Pan',
    commands: [
      { term: 'pan_to_location',       examples: '"pan to London", "move to Berlin"' },
      { term: 'pan_direction',         examples: '"pan north", "move west a bit"' },
      { term: 'pan_by_pixels',         examples: '"pan 200px right", "shift left 100 pixels"' },
      { term: 'fly_to',                examples: '"fly to Tokyo", "take me to Rome"' },
      { term: 'jump_to_coordinates',   examples: '"jump to 48.8, 2.3", "go to coordinates"' },
      { term: 'center_on_marker',      examples: '"center on the Eiffel Tower", "focus on Big Ben"' },
      { term: 'center_on_user_location', examples: '"where am I", "show my location", "find me"' },
    ],
  },
  {
    label: 'Markers',
    commands: [
      { term: 'add_marker',          examples: '"drop a pin on Paris", "mark the Eiffel Tower"' },
      { term: 'add_markers',         examples: '"mark London, Tokyo and Sydney", "pin these cities"' },
      { term: 'remove_marker',       examples: '"remove the Paris marker", "delete the Tokyo pin"' },
      { term: 'remove_all_markers',  examples: '"clear all markers", "remove all pins", "clean the map"' },
    ],
  },
  {
    label: 'Layers',
    commands: [
      { term: 'switch_base_layer', examples: '"switch to satellite", "show terrain", "dark mode map"' },
      { term: 'toggle_overlay',    examples: '"show railways", "toggle heatmap", "hide railways"' },
    ],
  },
]

function MapCommandsDropdown() {
  const [open, setOpen] = useState(false)

  return (
    <div className="absolute top-3 right-3 z-[1000]">
      <button
        onClick={() => setOpen(o => !o)}
        title="Map commands reference"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-900/90 border border-white/12 text-xs text-gray-300 shadow-lg hover:bg-surface-800 hover:text-white transition-all backdrop-blur-sm"
      >
        <BookOpen size={13} />
        Commands
      </button>

      {open && (
        <div className="absolute top-9 right-0 w-[340px] max-h-[420px] overflow-y-auto rounded-xl bg-surface-900/95 border border-white/12 shadow-2xl backdrop-blur-md">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
            <span className="text-xs font-semibold text-gray-200 uppercase tracking-wider">Map Commands</span>
            <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-200 transition-colors">
              <X size={14} />
            </button>
          </div>

          {/* Groups */}
          <div className="p-3 space-y-4">
            {COMMAND_GROUPS.map(group => (
              <div key={group.label}>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-accent-400 mb-2 px-1">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.commands.map(cmd => (
                    <div
                      key={cmd.term}
                      className="grid grid-cols-[140px_1fr] gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <code className="text-[11px] text-accent-300 font-mono self-center truncate">{cmd.term}</code>
                      <span className="text-[11px] text-gray-400 leading-snug">{cmd.examples}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const UAE_CENTER: [number, number] = [23.4241, 53.8478]
const UAE_ZOOM = 6
const MIN_PCT = 15
const MAX_PCT = 85

const MAP_SUGGESTIONS = [
  'Fly to Tokyo',
  'Switch to satellite',
  'Show railways overlay',
  'Jump to my location',
]

/** Invalidates Leaflet's cached size whenever splitPct changes */
function MapResizer({ splitPct }: { splitPct: number }) {
  const map = useMap()
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 0)
    return () => clearTimeout(t)
  }, [map, splitPct])
  return null
}

/** Captures the Leaflet map instance into the provided ref */
function MapController({ mapRef }: { mapRef: React.MutableRefObject<LeafletMap | null> }) {
  const map = useMap()
  useEffect(() => {
    mapRef.current = map
  }, [map, mapRef])
  return null
}

/** Restores persisted markers on mount and saves center/zoom/layers on every move/zoom */
function MapStateSync({
  conversation,
  onUpdateConversation,
}: {
  conversation: Conversation
  onUpdateConversation: (updater: (prev: Conversation) => Conversation) => void
}) {
  const map = useMap()
  const updateRef = useRef(onUpdateConversation)
  updateRef.current = onUpdateConversation

  // Restore markers when this map conversation is first loaded
  useEffect(() => {
    restoreMarkers(conversation.mapState?.markers ?? [], map)
    return () => {
      for (const m of markerRegistry.values()) m.remove()
      markerRegistry.clear()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  // Persist center + zoom whenever the user pans or zooms manually
  useEffect(() => {
    function save() {
      const { lat, lng } = map.getCenter()
      const zoom = map.getZoom()
      updateRef.current(prev => ({
        ...prev,
        mapState: {
          ...prev.mapState,
          center: [lat, lng],
          zoom,
          markers: prev.mapState?.markers ?? [],
        },
      }))
    }
    map.on('moveend', save)
    map.on('zoomend', save)
    return () => {
      map.off('moveend', save)
      map.off('zoomend', save)
    }
  }, [map])

  return null
}

/** Renders the railway tile overlay */
function RailwayOverlay() {
  return (
    <TileLayer
      url="https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png"
      attribution='&copy; <a href="https://www.openrailwaymap.org/">OpenRailwayMap</a>'
      maxZoom={19}
      opacity={0.7}
    />
  )
}

/** Renders a heatmap layer using leaflet.heat around the current map center */
function HeatmapOverlay() {
  const map = useMap()
  const heatLayerRef = useRef<L.HeatLayer | null>(null)

  useEffect(() => {
    // Generate demo heatmap points around the current center
    function buildPoints(): L.HeatLatLngTuple[] {
      const { lat, lng } = map.getCenter()
      const points: L.HeatLatLngTuple[] = []
      // 200 random points in a ~1° radius with random intensity
      for (let i = 0; i < 200; i++) {
        const dlat = (Math.random() - 0.5) * 2
        const dlng = (Math.random() - 0.5) * 2
        const intensity = Math.random()
        points.push([lat + dlat, lng + dlng, intensity])
      }
      return points
    }

    heatLayerRef.current = L.heatLayer(buildPoints(), {
      radius: 25,
      blur: 20,
      maxZoom: 17,
      gradient: { 0.2: '#3b82f6', 0.5: '#a855f7', 0.8: '#ef4444', 1.0: '#fbbf24' },
    }).addTo(map)

    function refresh() {
      if (heatLayerRef.current) {
        heatLayerRef.current.setLatLngs(buildPoints())
      }
    }
    map.on('moveend', refresh)

    return () => {
      map.off('moveend', refresh)
      if (heatLayerRef.current) {
        heatLayerRef.current.remove()
        heatLayerRef.current = null
      }
    }
  }, [map])

  return null
}

export function OpenStreetMapView({ theme, conversation, onUpdateConversation }: Props) {
  const [splitPct, setSplitPct] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const mapRef = useRef<LeafletMap | null>(null)

  // Layer state — initialise from persisted mapState if available
  const [baseLayer, setBaseLayerState] = useState<BaseLayer>(
    conversation.mapState?.baseLayer ?? 'street'
  )
  const [activeOverlays, setActiveOverlays] = useState<OverlayLayer[]>(
    conversation.mapState?.activeOverlays ?? []
  )

  // Expose setters via a ref so mapTools can call them without stale closures
  const layerCallbackRef = useRef<{
    setBaseLayer: (l: BaseLayer) => void
    toggleOverlay: (o: OverlayLayer, visible: boolean) => void
  }>({
    setBaseLayer: setBaseLayerState,
    toggleOverlay: (overlay, visible) =>
      setActiveOverlays(prev =>
        visible ? (prev.includes(overlay) ? prev : [...prev, overlay]) : prev.filter(o => o !== overlay)
      ),
  })
  // Keep ref in sync as state closures change
  layerCallbackRef.current = {
    setBaseLayer: setBaseLayerState,
    toggleOverlay: (overlay, visible) =>
      setActiveOverlays(prev =>
        visible ? (prev.includes(overlay) ? prev : [...prev, overlay]) : prev.filter(o => o !== overlay)
      ),
  }

  const { isLoading, sendToAgent, stopAgent } = useMapAgent(
    mapRef,
    conversation,
    onUpdateConversation,
    layerCallbackRef,
  )

  // Persist layer state changes back into the conversation
  useEffect(() => {
    onUpdateConversation(prev => ({
      ...prev,
      mapState: {
        center: prev.mapState?.center ?? UAE_CENTER,
        zoom: prev.mapState?.zoom ?? UAE_ZOOM,
        markers: prev.mapState?.markers ?? [],
        baseLayer,
        activeOverlays,
      },
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseLayer, activeOverlays])

  const handleBaseLayerChange = useCallback((layer: BaseLayer) => {
    setBaseLayerState(layer)
  }, [])

  const handleToggleOverlay = useCallback((overlay: OverlayLayer) => {
    setActiveOverlays(prev =>
      prev.includes(overlay) ? prev.filter(o => o !== overlay) : [...prev, overlay]
    )
  }, [])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging.current || !containerRef.current) return
    const { left, width } = containerRef.current.getBoundingClientRect()
    const pct = ((e.clientX - left) / width) * 100
    setSplitPct(Math.min(MAX_PCT, Math.max(MIN_PCT, pct)))
  }, [])

  const onMouseUp = useCallback(() => {
    dragging.current = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [onMouseMove, onMouseUp])

  const tileConfig = TILE_LAYERS[baseLayer]

  return (
    <div ref={containerRef} className="flex flex-1 min-h-0 overflow-hidden">
      {/* Left: Chatbot */}
      <div
        className="flex flex-col min-h-0 min-w-0 overflow-hidden"
        style={{ width: `${splitPct}%` }}
      >
        <ChatWindow
          conversation={conversation}
          isLoading={isLoading}
          theme={theme}
          onSend={sendToAgent}
          onRegenerate={() => {}}
          onEdit={() => {}}
          suggestions={MAP_SUGGESTIONS}
          emptyTitle="Map Assistant"
          emptyDescription="Control the map with natural language. Try zooming, flying to places, switching layers, or adding markers."
        />
        <MessageInput
          onSend={sendToAgent}
          onStop={stopAgent}
          isLoading={isLoading}
          conversationId={conversation.id}
        />
      </div>

      {/* Drag handle */}
      <div
        onMouseDown={onMouseDown}
        className="relative flex-shrink-0 flex items-center justify-center cursor-col-resize group z-10"
        style={{ width: '9px' }}
      >
        {/* visible line */}
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-white/15 group-hover:bg-accent-500/70 transition-colors duration-150" />
        {/* grip dots */}
        <div className="relative flex flex-col items-center gap-[5px] z-10">
          {[0, 1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="w-[3px] h-[3px] rounded-full bg-white/25 group-hover:bg-accent-400 transition-colors duration-150"
            />
          ))}
        </div>
      </div>

      {/* Right: Map */}
      <div
        className="relative min-h-0 min-w-0 overflow-hidden"
        style={{ width: `${100 - splitPct}%` }}
      >
        <LayerControlPanel
          baseLayer={baseLayer}
          activeOverlays={activeOverlays}
          onBaseLayerChange={handleBaseLayerChange}
          onToggleOverlay={handleToggleOverlay}
        />
        <MapCommandsDropdown />
        <MapContainer
          center={conversation.mapState?.center ?? UAE_CENTER}
          zoom={conversation.mapState?.zoom ?? UAE_ZOOM}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            url={tileConfig.url}
            attribution={tileConfig.attribution}
            maxZoom={tileConfig.maxZoom ?? 19}
            keepBuffer={4}
            crossOrigin="anonymous"
          />
          {activeOverlays.includes('railways') && <RailwayOverlay />}
          {activeOverlays.includes('heatmap') && <HeatmapOverlay />}
          <MapResizer splitPct={splitPct} />
          <MapController mapRef={mapRef} />
          <MapStateSync conversation={conversation} onUpdateConversation={onUpdateConversation} />
        </MapContainer>
      </div>
    </div>
  )
}
