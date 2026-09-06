import React, { useState, useMemo } from 'react'
import { Search, Filter } from 'lucide-react'

const FLAG_COLORS = {
  CRITICAL: 'bg-red-500/15 text-red-400',
  URGENT: 'bg-red-500/15 text-red-400',
  HIGH: 'bg-orange-500/15 text-orange-400',
  LOW: 'bg-blue-500/15 text-blue-400',
  WATCH: 'bg-yellow-500/15 text-yellow-400',
  NORMAL: 'bg-green-500/15 text-green-400',
}

const CATEGORIES = [
  'All', 'Immune', 'Hematology', 'Hepatic', 'Hormonal',
  'GI', 'Renal', 'Inflammation', 'Autoimmune', 'Imaging'
]

const CATEGORY_COLORS = {
  Immune: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  Hematology: 'bg-red-500/15 text-red-400 border-red-500/20',
  Hepatic: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  Hormonal: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  GI: 'bg-teal-500/15 text-teal-400 border-teal-500/20',
  Renal: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  Inflammation: 'bg-orange-500/15 text-orange-300 border-orange-500/20',
  Autoimmune: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  Imaging: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
}

const FLAGS = ['All', 'CRITICAL', 'HIGH', 'LOW', 'WATCH', 'NORMAL']

export default function Records({ data }) {
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [flagFilter, setFlagFilter] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState('date')
  const [sortDir, setSortDir] = useState('desc')

  const filtered = useMemo(() => {
    let results = [...(data.findings || [])]

    if (categoryFilter !== 'All') {
      results = results.filter(f => f.category === categoryFilter)
    }
    if (flagFilter !== 'All') {
      results = results.filter(f => f.flag === flagFilter)
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      results = results.filter(f =>
        f.test_name?.toLowerCase().includes(term) ||
        f.source?.toLowerCase().includes(term) ||
        f.category?.toLowerCase().includes(term)
      )
    }

    results.sort((a, b) => {
      const aVal = a[sortField] || ''
      const bVal = b[sortField] || ''
      const cmp = String(aVal).localeCompare(String(bVal))
      return sortDir === 'asc' ? cmp : -cmp
    })

    return results
  }, [data.findings, categoryFilter, flagFilter, searchTerm, sortField, sortDir])

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-xl font-display text-hermes-gold">Medical Records</h2>

      {/* Search & Filters */}
      <div className="bg-hermes-card border border-hermes-border rounded-2xl p-4 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-hermes-muted" />
          <input
            type="text"
            placeholder="Search findings..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-hermes-surface border border-hermes-border rounded-xl pl-10 pr-4 py-2.5 font-ui text-sm text-hermes-text placeholder-hermes-muted focus:border-hermes-gold focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <Filter size={14} className="text-hermes-muted" />
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="bg-hermes-surface border border-hermes-border rounded-lg px-3 py-1.5 font-ui text-xs text-hermes-text focus:border-hermes-gold focus:outline-none"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={flagFilter}
            onChange={e => setFlagFilter(e.target.value)}
            className="bg-hermes-surface border border-hermes-border rounded-lg px-3 py-1.5 font-ui text-xs text-hermes-text focus:border-hermes-gold focus:outline-none"
          >
            {FLAGS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <span className="text-hermes-muted font-ui text-xs ml-auto">
            {filtered.length} of {data.findings?.length || 0}
          </span>
        </div>
      </div>

      {/* Records List (card-based for mobile friendliness) */}
      <div className="space-y-2">
        {filtered.map((f, i) => {
          const catStyle = CATEGORY_COLORS[f.category] || 'bg-hermes-surface text-hermes-muted border-hermes-border'
          return (
            <div
              key={i}
              className="bg-hermes-card border border-hermes-border rounded-2xl p-4 hover:border-hermes-gold/30 transition-all card-glow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-hermes-text text-sm font-bold">{f.test_name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-ui font-medium ${FLAG_COLORS[f.flag] || ''}`}>
                      {f.flag}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-ui">
                    <span className="text-hermes-muted">{f.date}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] border ${catStyle}`}>
                      {f.category}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-ui text-sm text-hermes-text">
                    {typeof f.value === 'string' && f.value.length > 20
                      ? f.value.slice(0, 20) + '...'
                      : f.value} <span className="text-hermes-muted text-xs">{f.unit}</span>
                  </p>
                  <p className="font-ui text-[10px] text-hermes-muted">ref: {f.reference_range}</p>
                </div>
              </div>
              <p className="text-hermes-muted text-xs mt-2 truncate">{f.source}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
