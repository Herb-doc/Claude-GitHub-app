import React, { useState, useMemo } from 'react'

const FLAG_COLORS = {
  CRITICAL: 'bg-red-900/50 text-red-400',
  URGENT: 'bg-red-900/50 text-red-400',
  HIGH: 'bg-orange-900/50 text-orange-400',
  LOW: 'bg-blue-900/50 text-blue-400',
  WATCH: 'bg-yellow-900/50 text-yellow-400',
  NORMAL: 'bg-green-900/50 text-green-400',
}

const CATEGORIES = [
  'All', 'Immune', 'Hematology', 'Hepatic', 'Hormonal',
  'GI', 'Renal', 'Inflammation', 'Autoimmune', 'Imaging'
]

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

  const SortIcon = ({ field }) => (
    <span className="text-hermes-muted ml-1">
      {sortField === field ? (sortDir === 'asc' ? '&#9650;' : '&#9660;') : '&#9670;'}
    </span>
  )

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-display text-hermes-gold">Medical Records</h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search findings..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="bg-hermes-surface border border-hermes-border rounded px-3 py-2 font-ui text-sm text-hermes-text placeholder-hermes-muted focus:border-hermes-gold focus:outline-none w-64"
        />

        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="bg-hermes-surface border border-hermes-border rounded px-3 py-2 font-ui text-sm text-hermes-text focus:border-hermes-gold focus:outline-none"
        >
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select
          value={flagFilter}
          onChange={e => setFlagFilter(e.target.value)}
          className="bg-hermes-surface border border-hermes-border rounded px-3 py-2 font-ui text-sm text-hermes-text focus:border-hermes-gold focus:outline-none"
        >
          {FLAGS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>

        <span className="text-hermes-muted font-ui text-xs ml-auto">
          {filtered.length} of {data.findings?.length || 0} findings
        </span>
      </div>

      {/* Table */}
      <div className="bg-hermes-card border border-hermes-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-hermes-surface border-b border-hermes-border">
                <th className="text-left px-4 py-3 font-ui text-xs text-hermes-muted tracking-wide cursor-pointer hover:text-hermes-gold" onClick={() => toggleSort('date')}>
                  DATE <SortIcon field="date" />
                </th>
                <th className="text-left px-4 py-3 font-ui text-xs text-hermes-muted tracking-wide cursor-pointer hover:text-hermes-gold" onClick={() => toggleSort('test_name')}>
                  TEST <SortIcon field="test_name" />
                </th>
                <th className="text-left px-4 py-3 font-ui text-xs text-hermes-muted tracking-wide">VALUE</th>
                <th className="text-left px-4 py-3 font-ui text-xs text-hermes-muted tracking-wide">REFERENCE</th>
                <th className="text-left px-4 py-3 font-ui text-xs text-hermes-muted tracking-wide cursor-pointer hover:text-hermes-gold" onClick={() => toggleSort('flag')}>
                  FLAG <SortIcon field="flag" />
                </th>
                <th className="text-left px-4 py-3 font-ui text-xs text-hermes-muted tracking-wide cursor-pointer hover:text-hermes-gold" onClick={() => toggleSort('category')}>
                  CATEGORY <SortIcon field="category" />
                </th>
                <th className="text-left px-4 py-3 font-ui text-xs text-hermes-muted tracking-wide">SOURCE</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f, i) => (
                <tr key={i} className="border-b border-hermes-border/30 hover:bg-hermes-surface/50 transition-colors">
                  <td className="px-4 py-3 font-ui text-xs text-hermes-muted">{f.date}</td>
                  <td className="px-4 py-3 text-sm font-bold text-hermes-text">{f.test_name}</td>
                  <td className="px-4 py-3 font-ui text-sm">
                    {f.value} <span className="text-hermes-muted text-xs">{f.unit}</span>
                  </td>
                  <td className="px-4 py-3 font-ui text-xs text-hermes-muted">{f.reference_range}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-ui font-bold ${FLAG_COLORS[f.flag] || ''}`}>
                      {f.flag}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-ui text-xs text-hermes-muted">{f.category}</td>
                  <td className="px-4 py-3 text-xs text-hermes-muted truncate max-w-[200px]">{f.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
