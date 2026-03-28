import React, { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea, Area, AreaChart
} from 'recharts'

const TREND_CONFIGS = [
  {
    key: 'testosterone',
    label: 'Total Testosterone',
    testName: 'Total Testosterone',
    unit: 'ng/dL',
    color: '#D4A843',
    refLow: 300,
    refHigh: 1000,
    optimalLow: 500,
    optimalHigh: 800,
  },
  {
    key: 'ferritin',
    label: 'Ferritin',
    testName: 'Ferritin',
    unit: 'ng/mL',
    color: '#FF4444',
    refLow: 38,
    refHigh: 380,
    optimalLow: 70,
    optimalHigh: 200,
  },
  {
    key: 'iga',
    label: 'IgA',
    testName: 'IgA',
    unit: 'mg/dL',
    color: '#4A8FD4',
    refLow: 20,
    refHigh: 172,
    optimalLow: 70,
    optimalHigh: 150,
  },
  {
    key: 'cd4cd8',
    label: 'CD4/CD8 Ratio',
    testName: 'CD4/CD8 Ratio',
    unit: 'ratio',
    color: '#3ABFBF',
    refLow: 0.92,
    refHigh: 3.72,
    optimalLow: 1.5,
    optimalHigh: 2.5,
  },
  {
    key: 'hscrp',
    label: 'hsCRP',
    testName: 'hsCRP',
    unit: 'mg/L',
    color: '#E08030',
    refLow: 0,
    refHigh: 3.0,
    optimalLow: 0,
    optimalHigh: 1.0,
  },
  {
    key: 'reticulocytes',
    label: 'Abs Reticulocytes',
    testName: 'Abs Reticulocytes',
    unit: '/uL',
    color: '#52C47A',
    refLow: 25000,
    refHigh: 90000,
    optimalLow: 40000,
    optimalHigh: 75000,
  },
  {
    key: 'hematocrit',
    label: 'Hematocrit',
    testName: 'Hematocrit',
    unit: '%',
    color: '#D4A843',
    refLow: 38.3,
    refHigh: 48.6,
    optimalLow: 40,
    optimalHigh: 45,
  },
]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-hermes-card border border-hermes-border rounded p-3 shadow-lg">
      <p className="font-ui text-xs text-hermes-muted mb-1">{label}</p>
      <p className="font-display text-lg" style={{ color: d.color }}>
        {d.value} <span className="text-xs text-hermes-muted">{d.payload?.unit}</span>
      </p>
      {d.payload?.source && (
        <p className="font-ui text-xs text-hermes-muted mt-1">Source: {d.payload.source}</p>
      )}
    </div>
  )
}

export default function Trends({ data }) {
  const [selectedTrend, setSelectedTrend] = useState('testosterone')
  const config = TREND_CONFIGS.find(t => t.key === selectedTrend)

  const chartData = useMemo(() => {
    if (!config) return []
    return (data.findings || [])
      .filter(f => f.test_name === config.testName && typeof f.value === 'number')
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(f => ({
        date: f.date,
        value: f.value,
        unit: config.unit,
        source: f.source,
        flag: f.flag,
      }))
  }, [data.findings, config])

  const yDomain = useMemo(() => {
    if (!chartData.length || !config) return [0, 100]
    const values = chartData.map(d => d.value)
    const min = Math.min(...values, config.refLow)
    const max = Math.max(...values, config.refHigh)
    const pad = (max - min) * 0.15
    return [Math.max(0, min - pad), max + pad]
  }, [chartData, config])

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display text-hermes-gold">Trend Analysis</h2>

      {/* Trend Selector */}
      <div className="flex flex-wrap gap-2">
        {TREND_CONFIGS.map(t => (
          <button
            key={t.key}
            onClick={() => setSelectedTrend(t.key)}
            className={`px-3 py-1.5 rounded font-ui text-xs transition-all ${
              selectedTrend === t.key
                ? 'text-hermes-bg font-bold'
                : 'bg-hermes-surface border border-hermes-border text-hermes-muted hover:text-hermes-text hover:border-hermes-gold'
            }`}
            style={selectedTrend === t.key ? { backgroundColor: t.color } : {}}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      {config && (
        <div className="bg-hermes-card border border-hermes-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-xl" style={{ color: config.color }}>
                {config.label}
              </h3>
              <p className="text-hermes-muted font-ui text-xs mt-1">
                Conventional range: {config.refLow}–{config.refHigh} {config.unit} &middot;
                Functional optimal: {config.optimalLow}–{config.optimalHigh} {config.unit}
              </p>
            </div>
            {chartData.length > 0 && (
              <div className="text-right">
                <p className="font-display text-2xl font-bold" style={{ color: config.color }}>
                  {chartData[chartData.length - 1].value}
                </p>
                <p className="font-ui text-xs text-hermes-muted">Latest ({chartData[chartData.length - 1].date})</p>
              </div>
            )}
          </div>

          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                <defs>
                  <linearGradient id={`gradient-${config.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={config.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={config.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E3057" />
                <XAxis
                  dataKey="date"
                  stroke="#6B82A0"
                  tick={{ fontSize: 11, fontFamily: 'monospace' }}
                />
                <YAxis
                  domain={yDomain}
                  stroke="#6B82A0"
                  tick={{ fontSize: 11, fontFamily: 'monospace' }}
                />
                <Tooltip content={<CustomTooltip />} />

                {/* Reference range band (conventional) */}
                <ReferenceArea
                  y1={config.refLow}
                  y2={config.refHigh}
                  fill="#52C47A"
                  fillOpacity={0.05}
                  label={{ value: 'Conventional Range', position: 'insideTopRight', fill: '#52C47A', fontSize: 10 }}
                />

                {/* Optimal range band (functional) */}
                <ReferenceArea
                  y1={config.optimalLow}
                  y2={config.optimalHigh}
                  fill="#3ABFBF"
                  fillOpacity={0.08}
                  label={{ value: 'Functional Optimal', position: 'insideBottomRight', fill: '#3ABFBF', fontSize: 10 }}
                />

                <ReferenceLine y={config.refLow} stroke="#52C47A" strokeDasharray="5 5" strokeOpacity={0.5} />
                <ReferenceLine y={config.refHigh} stroke="#52C47A" strokeDasharray="5 5" strokeOpacity={0.5} />

                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={config.color}
                  strokeWidth={2}
                  fill={`url(#gradient-${config.key})`}
                  dot={{ fill: config.color, strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 7, fill: config.color, stroke: '#E8EDF5', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[350px] flex items-center justify-center text-hermes-muted font-ui text-sm">
              No numeric data available for {config.label}.
              {config.testName === 'Hematocrit' && ' Values are currently recorded as "Elevated" without specific numbers.'}
            </div>
          )}

          {/* Data Points Table */}
          {chartData.length > 0 && (
            <div className="mt-4 border-t border-hermes-border pt-4">
              <h4 className="font-ui text-xs text-hermes-muted tracking-wide mb-2">DATA POINTS</h4>
              <div className="flex flex-wrap gap-4">
                {chartData.map((d, i) => (
                  <div key={i} className="bg-hermes-surface rounded px-3 py-2">
                    <p className="font-ui text-xs text-hermes-muted">{d.date}</p>
                    <p className="font-display text-lg font-bold" style={{ color: config.color }}>
                      {d.value} <span className="text-xs text-hermes-muted">{d.unit}</span>
                    </p>
                    <p className="font-ui text-[10px] text-hermes-muted">{d.source}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs font-ui text-hermes-muted">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-green-900/30 border border-green-800 rounded-sm inline-block" />
          Conventional Reference Range
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-teal-900/30 border border-teal-800 rounded-sm inline-block" />
          Functional/Naturopathic Optimal
        </span>
      </div>
    </div>
  )
}
