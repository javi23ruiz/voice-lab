import { useMemo, useState, useRef, useEffect } from 'react'
import { BarChart2, MessageSquare, TrendingUp, Zap, Brain, Cpu, DollarSign, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Conversation } from '../types'

interface Props {
  conversations: Conversation[]
  theme: 'dark' | 'light'
}

type DateFilter = 7 | 14 | 30 | 90 | 'all' | 'custom'
type ChartTab = 'conversations' | 'tokens' | 'cost'

const DATE_FILTERS: { label: string; value: Exclude<DateFilter, 'custom'> }[] = [
  { label: '7D',  value: 7   },
  { label: '14D', value: 14  },
  { label: '30D', value: 30  },
  { label: '90D', value: 90  },
  { label: 'All', value: 'all' },
]

const CHART_TABS: { label: string; value: ChartTab }[] = [
  { label: 'Conversations', value: 'conversations' },
  { label: 'Tokens',        value: 'tokens'        },
  { label: 'Cost',          value: 'cost'           },
]

// Pricing per million tokens (input / output)
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-opus-4-6':   { input: 15,   output: 75  },
  'claude-sonnet-4-6': { input: 3,    output: 15  },
  'claude-haiku-4-5':  { input: 0.80, output: 4   },
}
const DEFAULT_PRICE = PRICING['claude-sonnet-4-6']

function getConvMetrics(conv: Conversation) {
  let tokens = 0
  let cost = 0
  for (const m of conv.messages) {
    if (!m.usage) continue
    const price = PRICING[m.model ?? conv.model] ?? DEFAULT_PRICE
    tokens += m.usage.input_tokens + m.usage.output_tokens
    cost   += (m.usage.input_tokens  / 1_000_000) * price.input
           +  (m.usage.output_tokens / 1_000_000) * price.output
  }
  return { tokens, cost }
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return n.toFixed(0)
}

function formatCost(n: number): string {
  if (n === 0)    return '$0.00'
  if (n < 0.001)  return `$${n.toFixed(5)}`
  if (n < 0.01)   return `$${n.toFixed(4)}`
  if (n < 1)      return `$${n.toFixed(3)}`
  return `$${n.toFixed(2)}`
}

function getDaysArray(numDays: number): Date[] {
  const days: Date[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    days.push(d)
  }
  return days
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function shortModelName(model: string) {
  if (model.includes('opus'))   return 'Opus'
  if (model.includes('sonnet')) return 'Sonnet'
  if (model.includes('haiku'))  return 'Haiku'
  return model.split('-')[1] ?? model
}

function buildPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]
    const curr = pts[i]
    const cp1x = prev.x + (curr.x - prev.x) / 3
    const cp2x = prev.x + (2 * (curr.x - prev.x)) / 3
    d += ` C ${cp1x} ${prev.y} ${cp2x} ${curr.y} ${curr.x} ${curr.y}`
  }
  return d
}

// ─── Reusable line chart ──────────────────────────────────────────────────────
function SubLineChart({
  days,
  valueByDay,
  formatAxis,
  formatTooltip,
  isDark,
  lineColor,
  gradientId,
  areaColorStart,
  padL = 72,
}: {
  days: Date[]
  valueByDay: Map<string, number>
  formatAxis: (v: number) => string
  formatTooltip: (v: number) => string
  isDark: boolean
  lineColor: string
  gradientId: string
  areaColorStart: string
  padL?: number
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const numDays = days.length

  const data = days.map(d => ({ day: d, value: valueByDay.get(dateKey(d)) ?? 0 }))
  const rawMax = Math.max(...data.map(d => d.value), 0)
  const maxValue = rawMax === 0 ? 1 : rawMax * 1.1

  const svgWidth = 1000
  const svgHeight = 280
  const padR = 20, padT = 48, padB = 48
  const chartW = svgWidth - padL - padR
  const chartH = svgHeight - padT - padB

  const points = data.map((d, i) => ({
    x: padL + (numDays > 1 ? (i / (numDays - 1)) : 0.5) * chartW,
    y: padT + chartH - (d.value / maxValue) * chartH,
    value: d.value,
    day: d.day,
  }))

  const linePath = buildPath(points)
  const areaPath = linePath
    ? `${linePath} L ${points[points.length - 1].x} ${padT + chartH} L ${points[0].x} ${padT + chartH} Z`
    : ''

  const yTicks = Array.from({ length: 5 }, (_, i) => ({
    val: (rawMax * i) / 4,
    y: padT + chartH - (i / 4) * (chartH * (rawMax / maxValue)),
  }))

  const xLabelStep = numDays <= 14 ? 2 : numDays <= 30 ? 5 : numDays <= 90 ? 10 : Math.ceil(numDays / 9)
  const xLabels = points.filter((_, i) => i % xLabelStep === 0 || i === numDays - 1)

  const gridColor      = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'
  const axisTextColor  = isDark ? '#6b7280' : '#9ca3af'
  const dotBorderColor = isDark ? '#1e2235' : '#ffffff'
  const tooltipBg      = isDark ? '#0c0f1e' : '#1e293b'

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className="w-full"
      style={{ height: 280, overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={areaColorStart} />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </linearGradient>
      </defs>

      {yTicks.map((tick, i) => (
        <g key={i}>
          <line
            x1={padL} y1={tick.y} x2={svgWidth - padR} y2={tick.y}
            stroke={gridColor} strokeWidth={1}
          />
          <text
            x={padL - 8} y={tick.y + 4}
            textAnchor="end" fill={axisTextColor} fontSize={14} fontFamily="inherit"
          >
            {formatAxis(tick.val)}
          </text>
        </g>
      ))}

      {xLabels.map(pt => (
        <text
          key={pt.day.getTime()}
          x={pt.x} y={padT + chartH + 22}
          textAnchor="middle" fill={axisTextColor} fontSize={13} fontFamily="inherit"
        >
          {pt.day.toLocaleDateString([], { month: 'short', day: 'numeric' })}
        </text>
      ))}

      {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
      {linePath && (
        <path
          d={linePath} fill="none"
          stroke={lineColor} strokeWidth={2.5}
          strokeLinecap="round" strokeLinejoin="round"
        />
      )}

      {points.map((pt, i) => {
        const isHovered = hoveredIdx === i
        const dotY = pt.value > 0 ? pt.y : padT + chartH

        const tipW = 148, tipH = 44
        const tipX = Math.min(Math.max(pt.x - tipW / 2, padL), svgWidth - padR - tipW)
        const spaceAbove = dotY - padT
        const tipY = spaceAbove >= tipH + 12 ? dotY - tipH - 10 : dotY + 12

        return (
          <g key={i}>
            {isHovered && (
              <line
                x1={pt.x} y1={padT} x2={pt.x} y2={padT + chartH}
                stroke={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}
                strokeWidth={1} strokeDasharray="4 3"
              />
            )}
            {(pt.value > 0 || isHovered) && (
              <circle
                cx={pt.x} cy={dotY}
                r={isHovered ? 5.5 : 4}
                fill={lineColor} stroke={dotBorderColor} strokeWidth={2}
              />
            )}
            {isHovered && (
              <g>
                <rect
                  x={tipX} y={tipY} width={tipW} height={tipH}
                  rx={7} ry={7} fill={tooltipBg} opacity={0.97}
                />
                <text
                  x={tipX + tipW / 2} y={tipY + 16}
                  textAnchor="middle" fill="#d1d5db" fontSize={13} fontFamily="inherit"
                >
                  {pt.day.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </text>
                <text
                  x={tipX + tipW / 2} y={tipY + 32}
                  textAnchor="middle" fill={lineColor}
                  fontSize={14} fontWeight="bold" fontFamily="inherit"
                >
                  {formatTooltip(pt.value)}
                </text>
              </g>
            )}
            <rect
              x={pt.x - 14} y={padT} width={28} height={chartH}
              fill="transparent" style={{ cursor: 'crosshair' }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          </g>
        )
      })}
    </svg>
  )
}

// ─── Main dashboard ───────────────────────────────────────────────────────────
export function AnalyticsDashboard({ conversations, theme }: Props) {
  const isDark = theme === 'dark'
  const [dateFilter, setDateFilter] = useState<DateFilter>(30)
  const [customRange, setCustomRange] = useState<{ start: Date; end: Date } | null>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [chartTab, setChartTab] = useState<ChartTab>('conversations')

  const numDays = useMemo((): number => {
    if (dateFilter === 'custom' && customRange) {
      return Math.max(2, Math.ceil((customRange.end.getTime() - customRange.start.getTime()) / 86_400_000) + 1)
    }
    if (dateFilter === 'all') {
      if (conversations.length === 0) return 30
      const oldest = Math.min(...conversations.map(c => new Date(c.createdAt).getTime()))
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return Math.max(2, Math.ceil((today.getTime() - oldest) / 86_400_000) + 1)
    }
    return dateFilter as number
  }, [dateFilter, conversations, customRange])

  const filtered = useMemo(() => {
    if (dateFilter === 'all') return conversations
    if (dateFilter === 'custom' && customRange) {
      const s = new Date(customRange.start); s.setHours(0, 0, 0, 0)
      const e = new Date(customRange.end);   e.setHours(23, 59, 59, 999)
      return conversations.filter(c => { const d = new Date(c.createdAt); return d >= s && d <= e })
    }
    const cutoff = new Date()
    cutoff.setHours(0, 0, 0, 0)
    cutoff.setDate(cutoff.getDate() - (dateFilter as number) + 1)
    return conversations.filter(c => new Date(c.createdAt) >= cutoff)
  }, [conversations, dateFilter, customRange])

  const days = useMemo(() => {
    if (dateFilter === 'custom' && customRange) {
      const result: Date[] = []
      const cur = new Date(customRange.start); cur.setHours(0, 0, 0, 0)
      const end = new Date(customRange.end);   end.setHours(0, 0, 0, 0)
      while (cur <= end) { result.push(new Date(cur)); cur.setDate(cur.getDate() + 1) }
      return result
    }
    return getDaysArray(numDays)
  }, [dateFilter, customRange, numDays])

  // Per-day maps
  const countByDay = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of filtered) {
      const d = new Date(c.createdAt); d.setHours(0, 0, 0, 0)
      map.set(dateKey(d), (map.get(dateKey(d)) || 0) + 1)
    }
    return map
  }, [filtered])

  const tokensByDay = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of filtered) {
      const d = new Date(c.createdAt); d.setHours(0, 0, 0, 0)
      const k = dateKey(d)
      map.set(k, (map.get(k) || 0) + getConvMetrics(c).tokens)
    }
    return map
  }, [filtered])

  const costByDay = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of filtered) {
      const d = new Date(c.createdAt); d.setHours(0, 0, 0, 0)
      const k = dateKey(d)
      map.set(k, (map.get(k) || 0) + getConvMetrics(c).cost)
    }
    return map
  }, [filtered])

  // KPIs
  const totalConversations = filtered.length
  const totalMessages = filtered.reduce((sum, c) => sum + c.messages.length, 0)
  const avgMessages = totalConversations > 0
    ? (totalMessages / totalConversations).toFixed(1)
    : '0'

  const modelCounts = new Map<string, number>()
  for (const c of filtered) {
    modelCounts.set(c.model, (modelCounts.get(c.model) || 0) + 1)
  }
  let topModel = '', topCount = 0
  for (const [model, count] of modelCounts.entries()) {
    if (count > topCount) { topModel = model; topCount = count }
  }

  const totalTokens = useMemo(() =>
    filtered.reduce((sum, c) => sum + getConvMetrics(c).tokens, 0), [filtered])
  const totalCost = useMemo(() =>
    filtered.reduce((sum, c) => sum + getConvMetrics(c).cost, 0), [filtered])

  const filterLabel = dateFilter === 'all'
    ? 'All time'
    : dateFilter === 'custom' && customRange
      ? `${customRange.start.toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${customRange.end.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`
      : `Last ${dateFilter} days`

  // Chart config per tab
  const chartConfig = {
    conversations: {
      title: 'Conversations per Day',
      subtitle: filterLabel,
      lineColor:      isDark ? '#6366f1' : '#4f52d8',
      gradientId:     'convAreaGrad',
      areaColorStart: isDark ? 'rgba(99,102,241,0.25)'  : 'rgba(79,82,216,0.15)',
      valueByDay:     countByDay,
      formatAxis:     (v: number) => String(Math.round(v)),
      formatTooltip:  (v: number) => `${Math.round(v)} ${Math.round(v) === 1 ? 'conversation' : 'conversations'}`,
      isEmpty:        filtered.length === 0,
      emptyMsg:       'No conversation data for this period',
      padL:           56,
    },
    tokens: {
      title: 'Total Tokens per Day',
      subtitle: `Input + output tokens across all messages · ${filterLabel}`,
      lineColor:      isDark ? '#10b981' : '#059669',
      gradientId:     'tokensAreaGrad',
      areaColorStart: isDark ? 'rgba(16,185,129,0.22)' : 'rgba(5,150,105,0.12)',
      valueByDay:     tokensByDay,
      formatAxis:     (v: number) => formatTokens(Math.round(v)),
      formatTooltip:  (v: number) => `${formatTokens(Math.round(v))} tokens`,
      isEmpty:        filtered.length === 0 || totalTokens === 0,
      emptyMsg:       'No token data for this period',
      padL:           72,
    },
    cost: {
      title: 'Estimated Cost per Day',
      subtitle: `Estimated API cost across all messages · ${filterLabel}`,
      lineColor:      isDark ? '#f59e0b' : '#d97706',
      gradientId:     'costAreaGrad',
      areaColorStart: isDark ? 'rgba(245,158,11,0.22)'  : 'rgba(217,119,6,0.12)',
      valueByDay:     costByDay,
      formatAxis:     (v: number) => formatCost(v),
      formatTooltip:  (v: number) => formatCost(v),
      isEmpty:        filtered.length === 0 || totalCost === 0,
      emptyMsg:       'No cost data for this period',
      padL:           80,
    },
  } as const

  const cfg = chartConfig[chartTab]

  return (
    <div
      className={`flex-1 overflow-y-auto animate-fade-in ${
        isDark ? 'bg-surface-900 text-gray-100' : 'bg-surface-50 text-gray-900'
      }`}
    >
      <div className="max-w-5xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <BarChart2 size={22} className="text-accent-500" />
              <h2 className="text-xl font-bold tracking-tight">Analytics</h2>
            </div>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Insights across your conversation history
            </p>
          </div>

          {/* Calendar icon + date filter pills */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setCalendarOpen(v => !v)}
                title="Custom date range"
                className={`p-1.5 rounded-lg transition-colors ${
                  dateFilter === 'custom'
                    ? 'text-accent-400 bg-accent-500/15'
                    : isDark
                      ? 'text-gray-400 hover:text-gray-200 hover:bg-white/8'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <CalendarIcon size={14} />
              </button>
              {calendarOpen && (
                <CalendarPicker
                  isDark={isDark}
                  initialStart={customRange?.start ?? null}
                  initialEnd={customRange?.end ?? null}
                  onApply={(start: Date, end: Date) => {
                    setCustomRange({ start, end })
                    setDateFilter('custom')
                    setCalendarOpen(false)
                  }}
                  onClose={() => setCalendarOpen(false)}
                />
              )}
            </div>

            <div className={`flex items-center gap-1 rounded-lg p-1 ${isDark ? 'bg-surface-800' : 'bg-white border border-gray-200'}`}>
              {DATE_FILTERS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setDateFilter(f.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    dateFilter === f.value
                      ? 'bg-accent-500 text-white'
                      : isDark
                        ? 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 1 — core KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <StatCard title="Conversations" value={totalConversations.toString()} icon={<MessageSquare size={16} />} isDark={isDark} />
          <StatCard title="Total Messages" value={totalMessages.toString()} icon={<TrendingUp size={16} />} isDark={isDark} />
          <StatCard title="Avg per Chat"  value={avgMessages} icon={<Zap size={16} />} isDark={isDark} />
          <StatCard title="Top Model" value={topModel ? shortModelName(topModel) : '—'} icon={<Brain size={16} />} isDark={isDark} />
        </div>

        {/* Row 2 — token & cost KPI cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <StatCard title="Total Tokens" value={formatTokens(totalTokens)} icon={<Cpu size={16} />} isDark={isDark} />
          <StatCard title="Total Cost"   value={formatCost(totalCost)}     icon={<DollarSign size={16} />} isDark={isDark} />
        </div>

        {/* Tabbed chart */}
        <div
          className={`rounded-2xl border p-6 ${
            isDark ? 'bg-surface-800 border-white/8' : 'bg-white border-gray-200'
          }`}
        >
          {/* Chart header: title + tabs */}
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h3 className={`text-sm font-semibold mb-1 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                {cfg.title}
              </h3>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {cfg.subtitle}
              </p>
            </div>

            {/* Tab pills */}
            <div className={`flex items-center gap-1 rounded-lg p-1 flex-shrink-0 ${isDark ? 'bg-surface-900' : 'bg-gray-100'}`}>
              {CHART_TABS.map(t => (
                <button
                  key={t.value}
                  onClick={() => setChartTab(t.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    chartTab === t.value
                      ? 'bg-accent-500 text-white'
                      : isDark
                        ? 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chart body */}
          {cfg.isEmpty ? (
            <div className={`flex items-center justify-center h-48 text-sm ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
              {cfg.emptyMsg}
            </div>
          ) : (
            <SubLineChart
              key={chartTab}
              days={days}
              valueByDay={cfg.valueByDay}
              formatAxis={cfg.formatAxis}
              formatTooltip={cfg.formatTooltip}
              isDark={isDark}
              lineColor={cfg.lineColor}
              gradientId={cfg.gradientId}
              areaColorStart={cfg.areaColorStart}
              padL={cfg.padL}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title, value, icon, isDark,
}: {
  title: string
  value: string
  icon: React.ReactNode
  isDark: boolean
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        isDark ? 'bg-surface-800 border-white/8' : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[11px] font-medium uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          {title}
        </span>
        <span className="text-accent-500 opacity-80">{icon}</span>
      </div>
      <p className={`text-2xl font-bold tracking-tight ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  )
}

// ─── Calendar date-range picker ───────────────────────────────────────────────
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DOW_LABELS  = ['Su','Mo','Tu','We','Th','Fr','Sa']

function CalendarPicker({
  isDark,
  onApply,
  onClose,
  initialStart,
  initialEnd,
}: {
  isDark: boolean
  onApply: (start: Date, end: Date) => void
  onClose: () => void
  initialStart: Date | null
  initialEnd:   Date | null
}) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])

  const [viewYear,  setViewYear]  = useState(() => (initialEnd ?? today).getFullYear())
  const [viewMonth, setViewMonth] = useState(() => (initialEnd ?? today).getMonth())
  const [start, setStart] = useState<Date | null>(initialStart)
  const [end,   setEnd]   = useState<Date | null>(initialEnd)
  const [hovered, setHovered] = useState<Date | null>(null)

  const wrapperRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const firstDow = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d))
  while (cells.length % 7 !== 0) cells.push(null)

  function handleDayClick(date: Date) {
    if (!start || (start && end)) {
      setStart(new Date(date)); setEnd(null)
    } else {
      const d = new Date(date)
      if (d < start) { setEnd(start); setStart(d) }
      else            { setEnd(d) }
    }
  }

  function rangeFor(date: Date): 'start' | 'end' | 'in' | null {
    const s = start
    const e = end ?? (start && !end ? hovered : null)
    if (!s) return null
    const lo = e && e < s ? e : s
    const hi = e && e < s ? s : (e ?? s)
    const t = date.getTime()
    if (t === lo.getTime()) return 'start'
    if (t === hi.getTime()) return 'end'
    if (t > lo.getTime() && t < hi.getTime()) return 'in'
    return null
  }

  const canApply = !!(start && end)

  const bg        = isDark ? 'bg-surface-900 border-white/10 shadow-2xl' : 'bg-white border-gray-200 shadow-xl'
  const textMain  = isDark ? 'text-gray-100' : 'text-gray-900'
  const textSub   = isDark ? 'text-gray-400' : 'text-gray-500'
  const textMuted = isDark ? 'text-gray-600' : 'text-gray-300'
  const hoverDay  = isDark ? 'hover:bg-white/8' : 'hover:bg-gray-100'
  const todayRing = isDark ? 'ring-1 ring-accent-400/60' : 'ring-1 ring-accent-600/50'
  const rangeBg   = isDark ? 'bg-accent-500/15 text-gray-200' : 'bg-accent-500/10 text-gray-700'
  const activeBg  = 'bg-accent-500 text-white'
  const divider   = isDark ? 'border-white/8' : 'border-gray-100'
  const navBtn    = `p-1 rounded-lg transition-colors ${hoverDay} ${textSub}`

  return (
    <div
      ref={wrapperRef}
      className={`absolute right-0 top-full mt-2 z-50 w-72 rounded-2xl border p-4 ${bg}`}
    >
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className={navBtn}><ChevronLeft  size={15} /></button>
        <span className={`text-sm font-semibold ${textMain}`}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button onClick={nextMonth} className={navBtn}><ChevronRight size={15} /></button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DOW_LABELS.map(d => (
          <div key={d} className={`text-center text-[10px] font-medium py-1 ${textMuted}`}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((date, i) => {
          if (!date) return <div key={`pad-${i}`} />
          const pos      = rangeFor(date)
          const isToday  = date.getTime() === today.getTime()
          const isActive = pos === 'start' || pos === 'end'
          const isIn     = pos === 'in'
          return (
            <button
              key={date.getTime()}
              onClick={() => handleDayClick(date)}
              onMouseEnter={() => { if (start && !end) setHovered(date) }}
              onMouseLeave={() => setHovered(null)}
              className={`
                text-xs h-8 w-full rounded-lg transition-colors
                ${isActive ? activeBg : isIn ? rangeBg : `${hoverDay} ${textMain}`}
                ${isToday && !isActive ? todayRing : ''}
              `}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>

      <p className={`text-[10px] text-center mt-3 ${textMuted}`}>
        {!start
          ? 'Select start date'
          : !end
            ? 'Select end date'
            : `${start.toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString([], { month: 'short', day: 'numeric' })}`
        }
      </p>

      <div className={`flex items-center justify-between mt-3 pt-3 border-t ${divider}`}>
        <button
          onClick={onClose}
          className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${hoverDay} ${textSub}`}
        >
          Cancel
        </button>
        <button
          onClick={() => { if (start && end) onApply(start, end) }}
          disabled={!canApply}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
            canApply
              ? 'bg-accent-500 text-white hover:bg-accent-600'
              : isDark ? 'bg-white/5 text-gray-600' : 'bg-gray-100 text-gray-400'
          }`}
        >
          Apply
        </button>
      </div>
    </div>
  )
}
