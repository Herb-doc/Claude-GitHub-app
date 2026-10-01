import React, { useState } from 'react'
import { FlaskConical, Plus, TrendingUp } from 'lucide-react'

const FLAG_COLORS = {
  CRITICAL: 'text-red-400 bg-red-500/15',
  HIGH: 'text-orange-400 bg-orange-500/15',
  LOW: 'text-blue-400 bg-blue-500/15',
  WATCH: 'text-yellow-400 bg-yellow-500/15',
  NORMAL: 'text-green-400 bg-green-500/15',
}

export default function Analyze({ data, setData }) {
  const [labText, setLabText] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const parseWithHermes = async () => {
    if (!labText.trim()) return
    setLoading(true)
    setError(null)
    setResults(null)

    const apiKey = prompt('Enter your Anthropic API key:')
    if (!apiKey) {
      setLoading(false)
      return
    }

    try {
      const existingContext = data.findings.slice(0, 10).map(f =>
        `${f.date}: ${f.test_name} = ${f.value} ${f.unit} [${f.flag}]`
      ).join('\n')

      const protocols = data.protocols.map(p => p.name).join(', ')

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
          max_tokens: 4096,
          system: `You are HERMES, a medical intelligence system for Daniel M. Phend, ND, MH.
Parse the lab results below and return a JSON object with this structure:
{
  "findings": [{ "date": "", "test_name": "", "value": "", "unit": "", "reference_range": "", "flag": "CRITICAL|HIGH|LOW|WATCH|NORMAL", "category": "", "source": "Manual Upload" }],
  "analysis": {
    "summary": "Brief clinical summary",
    "comparisons": ["Comparison to previous values"],
    "trend_arrows": [{"test": "", "direction": "up|down|stable"}],
    "interpretation": { "conventional": "", "naturopathic": "" },
    "interactions": ["Any herb-drug interaction alerts"],
    "recommended_followup": ["Recommended follow-up tests"]
  }
}

Current protocols: ${protocols}

Recent values for comparison:
${existingContext}

Return ONLY valid JSON, no other text.`,
          messages: [{
            role: 'user',
            content: `Parse these lab results:\n\n${labText}`
          }]
        })
      })

      if (!response.ok) throw new Error(`API error: ${response.status}`)

      const result = await response.json()
      const text = result.content[0].text

      let parsed
      try {
        parsed = JSON.parse(text)
      } catch {
        const start = text.indexOf('{')
        const end = text.lastIndexOf('}') + 1
        parsed = JSON.parse(text.slice(start, end))
      }

      setResults(parsed)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const addToRecords = () => {
    if (!results?.findings) return
    const updated = {
      ...data,
      findings: [...results.findings, ...data.findings],
      metadata: {
        ...data.metadata,
        total_findings: data.findings.length + results.findings.length,
        last_sync: new Date().toISOString(),
      }
    }
    setData(updated)
    alert(`Added ${results.findings.length} findings to your records.`)
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <h2 className="text-xl font-display text-hermes-gold">Lab Analysis</h2>

      {/* Input */}
      <div className="bg-hermes-card border border-hermes-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl gradient-purple">
            <FlaskConical size={18} className="text-purple-200" />
          </div>
          <p className="text-hermes-muted text-sm">
            Paste lab results and HERMES will extract, flag, compare, and check interactions.
          </p>
        </div>
        <textarea
          value={labText}
          onChange={e => setLabText(e.target.value)}
          placeholder="Paste your raw lab results here..."
          rows={8}
          className="w-full bg-hermes-surface border border-hermes-border rounded-xl p-4 font-ui text-sm text-hermes-text placeholder-hermes-muted focus:border-hermes-gold focus:outline-none resize-y"
        />
        <div className="flex gap-3">
          <button
            onClick={parseWithHermes}
            disabled={loading || !labText.trim()}
            className="px-5 py-2.5 gradient-gold text-hermes-bg rounded-xl font-ui text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Parsing...' : 'Parse with HERMES'}
          </button>
          <label className="px-5 py-2.5 bg-hermes-surface border border-hermes-border rounded-xl font-ui text-sm text-hermes-muted cursor-pointer hover:border-hermes-gold transition-colors flex items-center">
            Upload PDF
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) {
                  setLabText(`[PDF uploaded: ${file.name}]\n\nNote: PDF text extraction runs in the Python agent.\nFor now, please paste the text content of your lab results.`)
                }
              }}
            />
          </label>
        </div>
      </div>

      {error && (
        <div className="bg-red-950/30 border border-red-800/50 rounded-2xl p-4">
          <p className="text-red-400 font-ui text-sm">{error}</p>
        </div>
      )}

      {results && (
        <div className="space-y-4">
          {results.findings && (
            <div className="bg-hermes-card border border-hermes-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-base text-hermes-gold">Extracted Values</h3>
                <button
                  onClick={addToRecords}
                  className="flex items-center gap-1.5 px-4 py-2 bg-green-900/20 text-green-400 border border-green-800/30 rounded-xl font-ui text-xs hover:bg-green-900/30 transition-colors"
                >
                  <Plus size={14} /> Add to Records
                </button>
              </div>
              <div className="space-y-2">
                {results.findings.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 bg-hermes-surface rounded-xl p-3">
                    <span className="font-ui text-[10px] text-hermes-muted w-20">{f.date}</span>
                    <span className="font-bold text-sm flex-1">{f.test_name}</span>
                    <span className="font-ui text-sm">{f.value} <span className="text-hermes-muted text-xs">{f.unit}</span></span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-ui font-medium ${FLAG_COLORS[f.flag] || ''}`}>
                      {f.flag}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.analysis && (
            <div className="bg-hermes-card border border-hermes-border rounded-2xl p-5 space-y-4">
              <h3 className="font-display text-base text-hermes-gold">HERMES Analysis</h3>

              {results.analysis.summary && (
                <div className="bg-hermes-surface rounded-xl p-4">
                  <p className="text-sm leading-relaxed">{results.analysis.summary}</p>
                </div>
              )}

              {results.analysis.trend_arrows?.length > 0 && (
                <div>
                  <p className="font-ui text-[10px] text-hermes-muted tracking-wider mb-2">TRENDS</p>
                  <div className="flex flex-wrap gap-2">
                    {results.analysis.trend_arrows.map((t, i) => (
                      <span key={i} className="flex items-center gap-1.5 bg-hermes-surface rounded-full px-3 py-1.5 font-ui text-xs">
                        <TrendingUp size={12} className={t.direction === 'up' ? 'text-red-400' : t.direction === 'down' ? 'text-blue-400' : 'text-hermes-muted'} />
                        {t.test}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {results.analysis.interpretation && (
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="bg-hermes-surface rounded-xl p-4">
                    <p className="font-ui text-[10px] text-hermes-muted tracking-wider mb-1">CONVENTIONAL</p>
                    <p className="text-sm">{results.analysis.interpretation.conventional}</p>
                  </div>
                  <div className="bg-hermes-surface rounded-xl p-4 border-l-2 border-hermes-teal">
                    <p className="font-ui text-[10px] text-hermes-teal tracking-wider mb-1">NATUROPATHIC</p>
                    <p className="text-sm">{results.analysis.interpretation.naturopathic}</p>
                  </div>
                </div>
              )}

              {results.analysis.interactions?.length > 0 && (
                <div className="bg-orange-950/20 border border-orange-800/30 rounded-xl p-4">
                  <p className="font-ui text-[10px] text-hermes-high tracking-wider mb-2">HERB-DRUG INTERACTIONS</p>
                  <ul className="space-y-1">
                    {results.analysis.interactions.map((x, i) => (
                      <li key={i} className="text-sm text-hermes-high flex items-start gap-2">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                        {x}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {results.analysis.recommended_followup?.length > 0 && (
                <div>
                  <p className="font-ui text-[10px] text-hermes-blue tracking-wider mb-2">RECOMMENDED FOLLOW-UP</p>
                  <ul className="space-y-1">
                    {results.analysis.recommended_followup.map((r, i) => (
                      <li key={i} className="text-sm text-hermes-blue flex items-start gap-2">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
