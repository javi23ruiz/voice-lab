import { marker as leafletMarker, divIcon, type Map as LeafletMap } from 'leaflet'
import type { MapMarker, BaseLayer, OverlayLayer } from './types'

// ─── Layer callback registry ───────────────────────────────────────────────────
/** Injected by OpenStreetMapView so tools can mutate React layer state */
export const layerCallbacks = {
  setBaseLayer: (_layer: BaseLayer): string => '⚠️ Layer controls not ready',
  toggleOverlay: (_overlay: OverlayLayer, _visible: boolean): string => '⚠️ Layer controls not ready',
}

const UAE_CENTER: [number, number] = [23.4241, 53.8478]
const UAE_ZOOM = 6

// ─── Marker registry ──────────────────────────────────────────────────────────
/** Shared registry keyed by label — used by tools and by OpenStreetMapView cleanup */
export const markerRegistry = new Map<string, ReturnType<typeof leafletMarker>>()

function makeUniqueLabel(base: string): string {
  if (!markerRegistry.has(base)) return base
  let i = 2
  while (markerRegistry.has(`${base}-${i}`)) i++
  return `${base}-${i}`
}

function createMarkerIcon() {
  return divIcon({
    html: '<div style="width:14px;height:14px;border-radius:50%;background:#818cf8;border:2.5px solid white;box-shadow:0 1px 5px rgba(0,0,0,0.6)"></div>',
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  })
}

export interface MapToolParam {
  type: string
  description: string
  default?: unknown
  required?: boolean
}

export interface MapTool {
  name: string
  type: 'map'
  description: string
  params: Record<string, MapToolParam>
  execute: (params: Record<string, unknown>, map: LeafletMap) => string | Promise<string>
}

export const mapTools: MapTool[] = [
  {
    name: 'zoom_in',
    type: 'map',
    description:
      'Zooms the map in by a number of levels. Use when the user wants more detail, to get closer, see more clearly, or explicitly says zoom in.',
    params: {
      amount: { type: 'number', description: 'Number of zoom levels to increase', default: 1 },
    },
    execute: ({ amount = 1 }, map) => {
      const newZoom = map.getZoom() + Number(amount)
      map.setZoom(newZoom)
      return `Zoomed in ${amount} level(s). Current zoom: ${newZoom}`
    },
  },
  {
    name: 'zoom_out',
    type: 'map',
    description:
      'Zooms the map out by a number of levels. Use when the user wants a wider view, to pull back, see more area, or explicitly says zoom out.',
    params: {
      amount: { type: 'number', description: 'Number of zoom levels to decrease', default: 1 },
    },
    execute: ({ amount = 1 }, map) => {
      const newZoom = map.getZoom() - Number(amount)
      map.setZoom(newZoom)
      return `Zoomed out ${amount} level(s). Current zoom: ${newZoom}`
    },
  },
  {
    name: 'zoom_to_level',
    type: 'map',
    description:
      'Sets the map to an exact zoom level (1–22). Use when the user specifies a zoom level by number or describes a view scale (e.g. "show the whole country", "street level", "building level", "city view").',
    params: {
      level: { type: 'number', description: 'Target zoom level between 1 and 22', required: true },
    },
    execute: ({ level }, map) => {
      const l = Math.min(22, Math.max(1, Number(level)))
      map.setZoom(l)
      return `Set zoom to level ${l}`
    },
  },
  {
    name: 'zoom_to_location',
    type: 'map',
    description:
      'Flies the map to specific coordinates with a zoom level. Use when the user mentions a place, city, country, or landmark by name. Use your world knowledge to supply the correct lat/lon.',
    params: {
      lat: { type: 'number', description: 'Latitude of the target location', required: true },
      lon: { type: 'number', description: 'Longitude of the target location', required: true },
      zoom: { type: 'number', description: 'Zoom level at destination', default: 12 },
    },
    execute: ({ lat, lon, zoom = 12 }, map) => {
      map.setView([Number(lat), Number(lon)], Number(zoom), { animate: false })
      return `Flying to (${lat}, ${lon}) at zoom ${zoom}`
    },
  },
  {
    name: 'zoom_to_fit',
    type: 'map',
    description:
      'Fits the map viewport to show all provided marker coordinates. Use when the user wants to see multiple locations at once.',
    params: {
      markers: {
        type: 'array',
        description: 'Array of {lat, lon} objects to fit in view',
        required: true,
      },
    },
    execute: ({ markers }, map) => {
      const pts = markers as Array<{ lat: number; lon: number }>
      if (!pts || !pts.length) return 'No markers provided'
      const bounds = pts.map(m => [m.lat, m.lon] as [number, number])
      map.fitBounds(bounds)
      return `Fitted map to ${pts.length} marker(s)`
    },
  },
  {
    name: 'reset_view',
    type: 'map',
    description:
      'Resets the map to the default UAE view. Use when the user says reset, go back to start, show the default view, or go home.',
    params: {},
    execute: (_params, map) => {
      map.setView(UAE_CENTER, UAE_ZOOM, { animate: false })
      return `Reset to default UAE view (zoom ${UAE_ZOOM})`
    },
  },
  {
    name: 'pan_to_location',
    type: 'map',
    description:
      'Pans (moves) the map to a specific lat/lon WITHOUT changing the zoom level. Use when the user wants to move to a place but keep the current zoom. Supports smooth (animated) or instant movement.',
    params: {
      lat: { type: 'number', description: 'Latitude of the target location', required: true },
      lon: { type: 'number', description: 'Longitude of the target location', required: true },
      animate: { type: 'boolean', description: 'Whether to animate the pan (true) or jump instantly (false)', default: true },
    },
    execute: ({ lat, lon, animate = true }, map) => {
      map.panTo([Number(lat), Number(lon)], { animate: Boolean(animate) })
      return `Panned to (${lat}, ${lon})${animate ? ' smoothly' : ' instantly'}`
    },
  },
  {
    name: 'pan_direction',
    type: 'map',
    description:
      'Pans the map in a cardinal direction (north, south, east, west) by a pixel amount. Use when the user says "pan north", "move left", "go south a bit", etc. At low zoom levels use a larger distance (300+).',
    params: {
      direction: { type: 'string', description: 'Direction to pan: north, south, east, or west', required: true },
      distance: { type: 'number', description: 'Pixels to pan (default 150; use 300+ at low zoom)', default: 150 },
    },
    execute: ({ direction, distance = 150 }, map) => {
      const d = Number(distance)
      const vectors: Record<string, [number, number]> = {
        north: [0, -d],
        south: [0, d],
        east: [d, 0],
        west: [-d, 0],
      }
      const dir = String(direction).toLowerCase()
      const v = vectors[dir]
      if (!v) return `Unknown direction "${direction}". Use north, south, east, or west.`
      map.panBy(v)
      return `Panned ${dir} by ${d}px`
    },
  },
  {
    name: 'pan_by_pixels',
    type: 'map',
    description:
      'Pans the map by an exact pixel offset. Positive x moves right (east), negative x moves left (west). Positive y moves down (south), negative y moves up (north).',
    params: {
      x: { type: 'number', description: 'Horizontal pixel offset (+east / -west)', required: true },
      y: { type: 'number', description: 'Vertical pixel offset (+south / -north)', required: true },
    },
    execute: ({ x, y }, map) => {
      map.panBy([Number(x), Number(y)])
      return `Panned by (${x}px, ${y}px)`
    },
  },
  {
    name: 'fly_to',
    type: 'map',
    description:
      'Smoothly animates the map to a location, combining pan and zoom in one fluid motion. Use when the user says "fly to", "take me to", "go to", or wants a cinematic transition to a place. Prefer this over zoom_to_location when movement is the primary intent.',
    params: {
      lat: { type: 'number', description: 'Latitude of the destination', required: true },
      lon: { type: 'number', description: 'Longitude of the destination', required: true },
      zoom: { type: 'number', description: 'Zoom level at destination (default 12)', default: 12 },
    },
    execute: ({ lat, lon, zoom = 12 }, map) => {
      map.flyTo([Number(lat), Number(lon)], Number(zoom), { duration: 0.8 })
      return `Flying to (${lat}, ${lon}) at zoom ${zoom}`
    },
  },
  {
    name: 'jump_to_coordinates',
    type: 'map',
    description:
      'Instantly teleports the map to exact coordinates with no animation. Use when the user provides raw lat/lon numbers and wants to jump there immediately, or says "go to coordinates", "jump to", "set position to".',
    params: {
      lat: { type: 'number', description: 'Target latitude', required: true },
      lon: { type: 'number', description: 'Target longitude', required: true },
      zoom: { type: 'number', description: 'Zoom level (omit to keep current zoom)', default: null },
    },
    execute: ({ lat, lon, zoom }, map) => {
      const z = zoom !== null && zoom !== undefined ? Number(zoom) : map.getZoom()
      map.setView([Number(lat), Number(lon)], z, { animate: false })
      return `Jumped to (${lat}, ${lon}) at zoom ${z}`
    },
  },
  {
    name: 'center_on_marker',
    type: 'map',
    description:
      'Centers the map on a specific marker or point of interest by panning to its coordinates without changing zoom. Use when the user says "center on the marker", "focus on [landmark]", or "show [place] in the middle". Use your world knowledge to supply the correct lat/lon.',
    params: {
      lat: { type: 'number', description: 'Latitude of the marker or point of interest', required: true },
      lon: { type: 'number', description: 'Longitude of the marker or point of interest', required: true },
      label: { type: 'string', description: 'Name or label of the marker (for the confirmation message)', default: 'marker' },
    },
    execute: ({ lat, lon, label = 'marker' }, map) => {
      map.panTo([Number(lat), Number(lon)])
      return `Centered map on ${label} at (${lat}, ${lon})`
    },
  },
  // ── Marker tools ──────────────────────────────────────────────────────────
  {
    name: 'add_marker',
    type: 'map',
    description:
      'Adds a single marker pin to the map at given coordinates with an optional label shown in a popup. Use when the user says "add a marker", "pin", "mark", "drop a pin on [place]", or "mark [place]".',
    params: {
      lat: { type: 'number', description: 'Latitude of the marker', required: true },
      lon: { type: 'number', description: 'Longitude of the marker', required: true },
      label: { type: 'string', description: 'Label shown in the popup', default: 'Marker' },
    },
    execute: ({ lat, lon, label = 'Marker' }, map) => {
      const key = makeUniqueLabel(String(label))
      const m = leafletMarker([Number(lat), Number(lon)], { icon: createMarkerIcon() })
        .bindPopup(key)
        .addTo(map)
      markerRegistry.set(key, m)
      return `Added marker "${key}" at (${lat}, ${lon})`
    },
  },
  {
    name: 'add_markers',
    type: 'map',
    description:
      'Adds multiple marker pins to the map in one call. Use when the user wants to mark several places at once.',
    params: {
      markers: {
        type: 'array',
        description: 'Array of { lat, lon, label? } objects',
        required: true,
      },
    },
    execute: ({ markers }, map) => {
      const pts = markers as Array<{ lat: number; lon: number; label?: string }>
      if (!pts?.length) return 'No markers provided'
      const added: string[] = []
      for (const p of pts) {
        const key = makeUniqueLabel(p.label ?? 'Marker')
        const m = leafletMarker([Number(p.lat), Number(p.lon)], { icon: createMarkerIcon() })
          .bindPopup(key)
          .addTo(map)
        markerRegistry.set(key, m)
        added.push(key)
      }
      return `Added ${added.length} marker(s): ${added.join(', ')}`
    },
  },
  {
    name: 'remove_marker',
    type: 'map',
    description:
      'Removes a specific marker by its label. Use when the user says "remove the [label] marker", "delete [place] pin", "clear the [name] marker".',
    params: {
      label: { type: 'string', description: 'Label of the marker to remove', required: true },
    },
    execute: ({ label }, _map) => {
      const key = String(label)
      let found = markerRegistry.get(key)
      let foundKey = key
      if (!found) {
        for (const [k, v] of markerRegistry.entries()) {
          if (k.toLowerCase() === key.toLowerCase()) {
            found = v
            foundKey = k
            break
          }
        }
      }
      if (!found) {
        const existing = Array.from(markerRegistry.keys()).join(', ') || 'none'
        return `⚠️ No marker with label "${key}". Current markers: ${existing}`
      }
      found.remove()
      markerRegistry.delete(foundKey)
      return `Removed marker "${foundKey}"`
    },
  },
  {
    name: 'remove_all_markers',
    type: 'map',
    description:
      'Removes all markers from the map. Use when the user says "clear all markers", "remove all pins", "clean the map".',
    params: {},
    execute: () => {
      const count = markerRegistry.size
      if (count === 0) return 'No markers to remove'
      for (const m of markerRegistry.values()) m.remove()
      markerRegistry.clear()
      return `Removed all ${count} marker(s)`
    },
  },
  {
    name: 'center_on_user_location',
    type: 'map',
    description:
      'Pans the map to the user\'s current GPS/device location using the browser geolocation API. Use when the user says "where am I", "show my location", "go to my position", "find me", or "center on me".',
    params: {},
    execute: (_params, map) =>
      new Promise<string>(resolve => {
        if (!navigator.geolocation) {
          resolve('⚠️ Geolocation is not supported by this browser.')
          return
        }
        navigator.geolocation.getCurrentPosition(
          pos => {
            const { latitude, longitude } = pos.coords
            map.panTo([latitude, longitude])
            resolve(`Centered on your location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`)
          },
          err => {
            resolve(`⚠️ Could not get your location: ${err.message}`)
          },
          { timeout: 10000 },
        )
      }),
  },
  // ── Layer tools ───────────────────────────────────────────────────────────
  {
    name: 'switch_base_layer',
    type: 'map',
    description:
      'Switches the base map tile style. Use when the user asks for satellite, terrain, dark, light, or street map. Options: street (default OSM), satellite (aerial imagery), terrain (topographic), dark (dark CartoDB), light (light CartoDB).',
    params: {
      layer: {
        type: 'string',
        description: 'Base layer to switch to: street | satellite | terrain | dark | light',
        required: true,
      },
    },
    execute: ({ layer }) => {
      const valid: BaseLayer[] = ['street', 'satellite', 'terrain', 'dark', 'light']
      const l = String(layer).toLowerCase() as BaseLayer
      if (!valid.includes(l)) return `⚠️ Unknown layer "${layer}". Choose from: ${valid.join(', ')}`
      return layerCallbacks.setBaseLayer(l)
    },
  },
  {
    name: 'toggle_overlay',
    type: 'map',
    description:
      'Shows or hides an overlay layer on the map. Use when the user says "show railways", "toggle heatmap", "hide railways", "enable heatmap", etc. Available overlays: railways (rail network), heatmap (density visualization).',
    params: {
      overlay: {
        type: 'string',
        description: 'Overlay to toggle: railways | heatmap',
        required: true,
      },
      visible: {
        type: 'boolean',
        description: 'true to show the overlay, false to hide it',
        required: true,
      },
    },
    execute: ({ overlay, visible }) => {
      const valid: OverlayLayer[] = ['railways', 'heatmap']
      const o = String(overlay).toLowerCase() as OverlayLayer
      if (!valid.includes(o)) return `⚠️ Unknown overlay "${overlay}". Choose from: ${valid.join(', ')}`
      return layerCallbacks.toggleOverlay(o, Boolean(visible))
    },
  },
]

/** Returns a plain-data snapshot of all markers currently on the map. */
export function getMarkerSnapshot(): MapMarker[] {
  const result: MapMarker[] = []
  for (const [label, m] of markerRegistry.entries()) {
    const { lat, lng } = m.getLatLng()
    result.push({ lat, lng, label })
  }
  return result
}

/** Clears the registry and restores markers from a saved snapshot. */
export function restoreMarkers(markers: MapMarker[], map: LeafletMap) {
  for (const m of markerRegistry.values()) m.remove()
  markerRegistry.clear()
  for (const p of markers) {
    const m = leafletMarker([p.lat, p.lng], { icon: createMarkerIcon() })
      .bindPopup(p.label)
      .addTo(map)
    markerRegistry.set(p.label, m)
  }
}

export function buildSystemPrompt(
  zoom: number,
  center: { lat: number; lng: number },
  baseLayer: BaseLayer = 'street',
  activeOverlays: OverlayLayer[] = [],
): string {
  const toolDocs = mapTools
    .map(t => {
      const paramLines = Object.entries(t.params)
        .map(
          ([k, v]) =>
            `  - ${k} (${v.type}${v.required ? ', required' : ''}): ${v.description}${v.default !== undefined ? ` [default: ${v.default}]` : ''}`,
        )
        .join('\n')
      return `Tool: ${t.name}\nDescription: ${t.description}${paramLines ? '\nParams:\n' + paramLines : '\nParams: none'}`
    })
    .join('\n\n')

  return `You are a map assistant controlling an interactive Leaflet map. Interpret natural language commands and respond by calling map tools.

CURRENT MAP STATE:
- Zoom level: ${zoom}
- Center: lat=${center.lat.toFixed(4)}, lng=${center.lng.toFixed(4)}
- Base layer: ${baseLayer}
- Active overlays: ${activeOverlays.length > 0 ? activeOverlays.join(', ') : 'none'}

ZOOM LEVEL REFERENCE:
1–3: Whole world
4–6: Continent
7–9: Country
10–12: City
13–15: Neighborhood
16–18: Street level
19–22: Building level

PAN TOOL GUIDE:
- pan_to_location: move to a place, keep zoom
- pan_direction: move north/south/east/west by pixels
- pan_by_pixels: move by exact pixel offset
- fly_to: animated zoom+pan to a place (cinematic)
- jump_to_coordinates: instant teleport to lat/lon
- center_on_marker: center on a landmark/POI
- center_on_user_location: use device GPS

MARKER TOOL GUIDE:
- add_marker: drop a single pin with a label popup
- add_markers: drop multiple pins in one call
- remove_marker: remove a specific pin by its label
- remove_all_markers: clear every pin from the map

LAYER TOOL GUIDE:
- switch_base_layer: change the base map style (street/satellite/terrain/dark/light)
- toggle_overlay: show or hide an overlay (railways/heatmap)

AVAILABLE TOOLS:
${toolDocs}

RESPONSE FORMAT — Return ONLY raw JSON, no markdown, no code fences, no explanation:

When calling a tool:
{"thinking": "<your reasoning>", "tool_call": {"name": "<tool_name>", "params": {<params as object>}}, "message": null}

When done (no more tools needed):
{"thinking": "<your reasoning>", "tool_call": null, "message": "<conversational reply to the user>"}

Rules:
- Always return valid JSON with no surrounding text
- Never wrap your response in markdown code fences
- Use your world knowledge for city/country coordinates (e.g. Paris = lat:48.8566, lon:2.3522)
- If the user's intent is ambiguous, pick the most reasonable interpretation
- For vague location requests, default zoom to 12
- After a tool executes successfully, reply with a short, friendly confirmation message`
}
