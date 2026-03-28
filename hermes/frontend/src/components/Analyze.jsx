import React, { useState } from 'react'

const FLAG_COLORS = {
  CRITICAL: 'text-red-400',
  HIGH: 'text-orange-400',
  LOW: 'text-blue-400',
  WATCH: 'text-yellow-400',
  NORMAL: 'text-green-400',
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

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

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
    <div className="space-y-6">
      <h2 className="text-2xl font-display text-hermes-gold">Lab Analysis</h2>

      {/* Input Area */}
      <div className="bg-hermes-card border border-hermes-border rounded-lg p-5 space-y-4">
        <p className="text-hermes-muted text-sm">
          Paste your lab results below and HERMES will extract values, flag abnormals,
          compare to your history, and check for herb-drug interactions.
        </p>
        <textarea
          value={labText}
          onChange={e => setLabText(e.target.value)}
          placeholder="Paste your raw lab results here..."
          rows={10}
          className="w-full bg-hermes-surface border border-hermes-border rounded p-4 font-ui text-sm text-hermes-text placeholder-hermes-muted focus:border-hermes-gold focus:outline-none resize-y"
        />
        <div className="flex gap-3">
          <button
            onClick={parseWithHermes}
            disabled={loading || !labText.trim()}
            className="px-6 py-3 bg-hermes-gold text-hermes-bg rounded font-ui text-sm font-bold hover:bg-yellow-500 transition-colors disabled:opacity-50"
          >
            {loading ? 'Parsing...' : 'Parse with HERMES'}
          </button>
          <label className="px-6 py-3 bg-hermes-surface border border-hermes-border rounded font-ui text-sm text-hermes-muted cursor-pointer hover:border-hermes-gold transition-colors flex items-center">
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

      {/* Error */}
      {error && (
        <div className="bg-red-950/50 border border-red-800 rounded-lg p-4">
          <p className="text-red-400 font-ui text-sm">{error}</p>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-4">
          {/* Extracted Values */}
          {results.findings && (
            <div className="bg-hermes-card border border-hermes-border rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg text-hermes-gold">Extracted Values</h3>
                <button
                  onClick={addToRecords}
                  className="px-4 py-2 bg-hermes-normal/20 text-hermes-normal border border-hermes-normal/30 rounded font-ui text-xs hover:bg-hermes-normal/30 transition-colors"
                >
                  Add to Records
                </button>
              </div>
              <div className="space-y-2">
                {results.findings.map((f, i) => (
                  <div key={i} className="flex items-center gap-4 bg-hermes-surface rounded p-3">
                    <span className="font-ui text-xs text-hermes-muted w-24">{f.date}</span>
                    <span className="font-bold text-sm flex-1">{f.test_name}</span>
                    <span className="font-ui text-sm">{f.value} {f.unit}</span>
                    <span className="font-ui text-xs text-hermes-muted">{f.reference_range}</span>
                    <span className={`font-ui text-xs font-bold ${FLAG_COLORS[f.flag] || ''}`}>
                      {f.flag}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analysis */}
          {results.analysis && (
            <div className="bg-hermes-card border border-hermes-border rounded-lg p-5 space-y-4">
              <h3 className="font-display text-lg text-hermes-gold">HERMES Analysis</h3>

              {results.analysis.summary && (
                <div>
                  <h4 className="font-ui text-xs text-hermes-muted tracking-wide mb-1">SUMMARY</h4>
                  <p className="text-sm">{results.analysis.summary}</p>
                </div>
              )}

              {results.analysis.trend_arrows?.length > 0 && (
                <div>
                  <h4 className="font-ui text-xs text-hermes-muted tracking-wide mb-2">TREND DIRECTION</h4>
                  <div className="flex flex-wrap gap-3">
                    {results.analysis.trend_arrows.map((t, i) => (
                      <span key={i} className="bg-hermes-surface rounded px-3 py-1 font-ui text-sm">
                        {t.test}
                        <span className="ml-2">
                          {t.direction === 'up' ? '&#8593;' : t.direction === 'down' ? '&#8595;' : '&#8596;'}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {results.analysis.interpretation && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-ui text-xs text-hermes-muted tracking-wide mb-1">CONVENTIONAL</h4>
                    <p className="text-sm">{results.analysis.interpretation.conventional}</p>
                  </div>
                  <div>
                    <h4 className="font-ui text-xs text-hermes-teal tracking-wide mb-1">NATUROPATHIC</h4>
                    <p className="text-sm">{results.analysis.interpretation.naturopathic}</p>
                  </div>
                </div>
              )}

              {results.analysis.interactions?.length > 0 && (
                <div>
                  <h4 className="font-ui text-xs text-hermes-high tracking-wide mb-1">&#9888; HERB-DRUG INTERACTIONS</h4>
                  <ul className="space-y-1">
                    {results.analysis.interactions.map((x, i) => (
                      <li key={i} className="text-sm text-hermes-high">&#8226; {x}</li>
                    ))}
                  </ul>
                </div>
              )}

              {results.analysis.recommended_followup?.length > 0 && (
                <div>
                  <h4 className="font-ui text-xs text-hermes-blue tracking-wide mb-1">RECOMMENDED FOLLOW-UP</h4>
                  <ul className="space-y-1">
                    {results.analysis.recommended_followup.map((r, i) => (
                      <li key={i} className="text-sm text-hermes-blue">&#8226; {r}</li>
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
