import { useState } from 'react'
import { Layers, X, Check } from 'lucide-react'
import type { BaseLayer, OverlayLayer } from '../types'

interface Props {
  baseLayer: BaseLayer
  activeOverlays: OverlayLayer[]
  onBaseLayerChange: (layer: BaseLayer) => void
  onToggleOverlay: (overlay: OverlayLayer) => void
}

const BASE_LAYERS: { id: BaseLayer; label: string; emoji: string }[] = [
  { id: 'street',    label: 'Street',    emoji: '🗺️' },
  { id: 'satellite', label: 'Satellite', emoji: '🛰️' },
  { id: 'terrain',   label: 'Terrain',   emoji: '⛰️' },
  { id: 'dark',      label: 'Dark',      emoji: '🌑' },
  { id: 'light',     label: 'Light',     emoji: '☀️' },
]

const OVERLAY_LAYERS: { id: OverlayLayer; label: string; emoji: string }[] = [
  { id: 'railways', label: 'Railways', emoji: '🚆' },
  { id: 'heatmap',  label: 'Heatmap',  emoji: '🔥' },
]

export function LayerControlPanel({ baseLayer, activeOverlays, onBaseLayerChange, onToggleOverlay }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="absolute top-3 right-[120px] z-[1000]">
      <button
        onClick={() => setOpen(o => !o)}
        title="Layer controls"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-900/90 border border-white/12 text-xs text-gray-300 shadow-lg hover:bg-surface-800 hover:text-white transition-all backdrop-blur-sm"
      >
        <Layers size={13} />
        Layers
      </button>

      {open && (
        <div className="absolute top-9 right-0 w-[220px] rounded-xl bg-surface-900/95 border border-white/12 shadow-2xl backdrop-blur-md">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
            <span className="text-xs font-semibold text-gray-200 uppercase tracking-wider">Layers</span>
            <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-200 transition-colors">
              <X size={14} />
            </button>
          </div>

          <div className="p-3 space-y-4">
            {/* Base layers */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-accent-400 mb-2 px-1">
                Base Map
              </p>
              <div className="space-y-0.5">
                {BASE_LAYERS.map(l => (
                  <button
                    key={l.id}
                    onClick={() => onBaseLayerChange(l.id)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-colors ${
                      baseLayer === l.id
                        ? 'bg-accent-500/20 text-accent-300'
                        : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                    }`}
                  >
                    <span>{l.emoji}</span>
                    <span className="flex-1 text-left">{l.label}</span>
                    {baseLayer === l.id && <Check size={11} className="text-accent-400" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Overlay layers */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-accent-400 mb-2 px-1">
                Overlays
              </p>
              <div className="space-y-0.5">
                {OVERLAY_LAYERS.map(l => {
                  const active = activeOverlays.includes(l.id)
                  return (
                    <button
                      key={l.id}
                      onClick={() => onToggleOverlay(l.id)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-colors ${
                        active
                          ? 'bg-accent-500/20 text-accent-300'
                          : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                      }`}
                    >
                      <span>{l.emoji}</span>
                      <span className="flex-1 text-left">{l.label}</span>
                      {/* Toggle pill */}
                      <span
                        className={`w-7 h-4 rounded-full flex-shrink-0 transition-colors flex items-center px-0.5 ${
                          active ? 'bg-accent-500' : 'bg-white/15'
                        }`}
                      >
                        <span
                          className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${
                            active ? 'translate-x-3' : 'translate-x-0'
                          }`}
                        />
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
