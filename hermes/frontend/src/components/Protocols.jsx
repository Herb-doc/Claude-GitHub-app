import React, { useState } from 'react'

export default function Protocols({ data, setData }) {
  const [showAdd, setShowAdd] = useState(false)
  const [interactionCheck, setInteractionCheck] = useState('')
  const [interactionResult, setInteractionResult] = useState(null)
  const [newProtocol, setNewProtocol] = useState({
    name: '', purpose: '', targets: '', notes: ''
  })

  const protocols = data.protocols || []

  const addProtocol = () => {
    if (!newProtocol.name.trim()) return
    const protocol = {
      name: newProtocol.name,
      purpose: newProtocol.purpose,
      status: 'active',
      start_date: new Date().toISOString().split('T')[0],
      targets: newProtocol.targets.split(',').map(t => t.trim()).filter(Boolean),
      notes: newProtocol.notes,
    }
    setData({
      ...data,
      protocols: [...data.protocols, protocol]
    })
    setNewProtocol({ name: '', purpose: '', targets: '', notes: '' })
    setShowAdd(false)
  }

  const toggleStatus = (index) => {
    const updated = [...data.protocols]
    updated[index] = {
      ...updated[index],
      status: updated[index].status === 'active' ? 'paused' : 'active'
    }
    setData({ ...data, protocols: updated })
  }

  const checkInteractions = async () => {
    if (!interactionCheck.trim()) return

    const apiKey = prompt('Enter your Anthropic API key:')
    if (!apiKey) return

    try {
      const activeProtocols = protocols
        .filter(p => p.status === 'active')
        .map(p => p.name)
        .join(', ')

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          system: 'You are HERMES, a medical intelligence system specializing in herb-drug interactions. Provide evidence-based interaction analysis with severity ratings (None, Minor, Moderate, Major) and clinical recommendations. Include peer-reviewed references where available.',
          messages: [{
            role: 'user',
            content: `Check for interactions between this medication/supplement:\n"${interactionCheck}"\n\nAnd these active herbal protocols:\n${activeProtocols}\n\nProvide a detailed interaction analysis.`
          }]
        })
      })

      if (!response.ok) throw new Error(`API error: ${response.status}`)
      const result = await response.json()
      setInteractionResult(result.content[0].text)
    } catch (err) {
      setInteractionResult(`Error: ${err.message}`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display text-hermes-gold">Active Protocols</h2>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 bg-hermes-gold text-hermes-bg rounded font-ui text-sm font-bold hover:bg-yellow-500 transition-colors"
        >
          {showAdd ? 'Cancel' : '+ Add Protocol'}
        </button>
      </div>

      {/* Add Protocol Form */}
      {showAdd && (
        <div className="bg-hermes-card border border-hermes-gold/30 rounded-lg p-5 space-y-3">
          <input
            value={newProtocol.name}
            onChange={e => setNewProtocol({ ...newProtocol, name: e.target.value })}
            placeholder="Herb/Supplement name"
            className="w-full bg-hermes-surface border border-hermes-border rounded px-3 py-2 font-ui text-sm text-hermes-text placeholder-hermes-muted focus:border-hermes-gold focus:outline-none"
          />
          <input
            value={newProtocol.purpose}
            onChange={e => setNewProtocol({ ...newProtocol, purpose: e.target.value })}
            placeholder="Purpose (e.g., 'Iron support')"
            className="w-full bg-hermes-surface border border-hermes-border rounded px-3 py-2 font-ui text-sm text-hermes-text placeholder-hermes-muted focus:border-hermes-gold focus:outline-none"
          />
          <input
            value={newProtocol.targets}
            onChange={e => setNewProtocol({ ...newProtocol, targets: e.target.value })}
            placeholder="Target markers (comma-separated, e.g., 'Ferritin, MCHC')"
            className="w-full bg-hermes-surface border border-hermes-border rounded px-3 py-2 font-ui text-sm text-hermes-text placeholder-hermes-muted focus:border-hermes-gold focus:outline-none"
          />
          <textarea
            value={newProtocol.notes}
            onChange={e => setNewProtocol({ ...newProtocol, notes: e.target.value })}
            placeholder="Notes"
            rows={2}
            className="w-full bg-hermes-surface border border-hermes-border rounded px-3 py-2 font-ui text-sm text-hermes-text placeholder-hermes-muted focus:border-hermes-gold focus:outline-none resize-y"
          />
          <button
            onClick={addProtocol}
            disabled={!newProtocol.name.trim()}
            className="px-4 py-2 bg-hermes-normal/20 text-hermes-normal border border-hermes-normal/30 rounded font-ui text-sm hover:bg-hermes-normal/30 transition-colors disabled:opacity-50"
          >
            Save Protocol
          </button>
        </div>
      )}

      {/* Protocol List */}
      <div className="space-y-3">
        {protocols.map((p, i) => (
          <div
            key={i}
            className={`bg-hermes-card border rounded-lg p-5 transition-all ${
              p.status === 'active' ? 'border-hermes-border' : 'border-hermes-border/30 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-display text-lg text-hermes-text font-bold">{p.name}</h3>
                  <span className={`px-2 py-0.5 rounded text-xs font-ui ${
                    p.status === 'active'
                      ? 'bg-green-900/50 text-green-400'
                      : 'bg-gray-900/50 text-gray-400'
                  }`}>
                    {p.status?.toUpperCase()}
                  </span>
                </div>
                <p className="text-hermes-gold font-ui text-sm mt-1">{p.purpose}</p>
                {p.targets?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {p.targets.map((t, j) => (
                      <span key={j} className="px-2 py-0.5 bg-hermes-surface rounded text-xs font-ui text-hermes-muted">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                {p.notes && (
                  <p className="text-hermes-muted text-sm mt-2 italic">{p.notes}</p>
                )}
                {p.start_date && (
                  <p className="text-hermes-muted font-ui text-xs mt-2">Started: {p.start_date}</p>
                )}
              </div>
              <button
                onClick={() => toggleStatus(i)}
                className="px-3 py-1 bg-hermes-surface border border-hermes-border rounded font-ui text-xs text-hermes-muted hover:border-hermes-gold transition-colors"
              >
                {p.status === 'active' ? 'Pause' : 'Resume'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Interaction Checker */}
      <div className="bg-hermes-card border border-hermes-border rounded-lg p-5 space-y-4">
        <h3 className="font-display text-lg text-hermes-high">Herb-Drug Interaction Checker</h3>
        <p className="text-hermes-muted text-sm">
          Enter a medication or supplement to check for interactions with your active protocols.
        </p>
        <div className="flex gap-3">
          <input
            value={interactionCheck}
            onChange={e => setInteractionCheck(e.target.value)}
            placeholder="Enter medication name (e.g., 'Metformin', 'Warfarin')"
            className="flex-1 bg-hermes-surface border border-hermes-border rounded px-3 py-2 font-ui text-sm text-hermes-text placeholder-hermes-muted focus:border-hermes-gold focus:outline-none"
          />
          <button
            onClick={checkInteractions}
            disabled={!interactionCheck.trim()}
            className="px-4 py-2 bg-hermes-high/20 text-hermes-high border border-hermes-high/30 rounded font-ui text-sm hover:bg-hermes-high/30 transition-colors disabled:opacity-50"
          >
            Check Interactions
          </button>
        </div>
        {interactionResult && (
          <div className="bg-hermes-surface rounded p-4 whitespace-pre-wrap text-sm font-ui">
            {interactionResult}
          </div>
        )}
      </div>
    </div>
  )
}
