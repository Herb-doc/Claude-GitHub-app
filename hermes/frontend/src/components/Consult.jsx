import React, { useState, useRef, useEffect } from 'react'

const SUGGESTED_QUESTIONS = [
  "What patterns concern you most in my current data?",
  "What should I prioritize before my next appointment?",
  "Explain my liver findings in plain language",
  "Are any of my herbs interacting with my findings?",
  "Generate a pre-appointment briefing for Dr. Dos Santos",
]

export default function Consult({ data }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [showKeyInput, setShowKeyInput] = useState(true)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const buildSystemPrompt = () => {
    const findings = data.findings.map(f =>
      `${f.date}: ${f.test_name} = ${f.value} ${f.unit} (ref: ${f.reference_range}) [${f.flag}] [${f.category}] — ${f.source}`
    ).join('\n')

    const protocols = data.protocols.map(p =>
      `${p.name}: ${p.purpose} | Targets: ${p.targets?.join(', ')} | Status: ${p.status} | Notes: ${p.notes || 'none'}`
    ).join('\n')

    return `You are HERMES — Health & Evidence Repository, Medical Expert & Synthesis.
You are Daniel M. Phend's personal medical intelligence system. Daniel is a Naturopathic Doctor (ND) and Master Herbalist (MH) with 40+ years of clinical experience specializing in immune and autoimmune disorders. Practice: Future Body Sciences, La Porte, Indiana.

Your personality: 60% clinical precision, 40% warm trusted friend. Address Daniel by name occasionally. You are his ally in understanding his own health data.

ALWAYS provide:
1. Both naturopathic AND conventional medical perspectives
2. Peer-reviewed references for clinical claims (cite journal, year)
3. Herb-drug interaction alerts proactively when relevant
4. Both conventional reference ranges AND functional/naturopathic optimal ranges
5. Clear, evidence-based reasoning

Primary physician: Dr. Catherine Dos Santos

COMPLETE PATIENT DATA:
${findings}

ACTIVE PROTOCOLS:
${protocols}

Patient metadata: ${JSON.stringify(data.metadata)}

Respond with clinical depth appropriate for a fellow practitioner, but explain complex findings clearly. Use markdown formatting for readability.`
  }

  const sendMessage = async (text) => {
    if (!text?.trim() || !apiKey) return
    const userMsg = { role: 'user', content: text }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    try {
      const apiMessages = updatedMessages.map(m => ({
        role: m.role,
        content: m.content
      }))

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
          system: buildSystemPrompt(),
          messages: apiMessages,
        })
      })

      if (!response.ok) throw new Error(`API error: ${response.status}`)
      const result = await response.json()
      const assistantMsg = { role: 'assistant', content: result.content[0].text }
      setMessages([...updatedMessages, assistantMsg])
    } catch (err) {
      setMessages([...updatedMessages, {
        role: 'assistant',
        content: `**Error:** ${err.message}\n\nPlease check your API key and try again.`
      }])
    } finally {
      setLoading(false)
    }
  }

  if (showKeyInput) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-display text-hermes-gold">Consult HERMES</h2>
        <div className="bg-hermes-card border border-hermes-border rounded-lg p-8 max-w-lg mx-auto space-y-4">
          <p className="text-hermes-muted text-sm text-center">
            Enter your Anthropic API key to start a consultation with HERMES.
            Your key is stored only in this browser session and never sent to any server other than Anthropic's API.
          </p>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
            className="w-full bg-hermes-surface border border-hermes-border rounded px-4 py-3 font-ui text-sm text-hermes-text placeholder-hermes-muted focus:border-hermes-gold focus:outline-none"
          />
          <button
            onClick={() => { if (apiKey.trim()) setShowKeyInput(false) }}
            disabled={!apiKey.trim()}
            className="w-full px-6 py-3 bg-hermes-gold text-hermes-bg rounded font-ui text-sm font-bold hover:bg-yellow-500 transition-colors disabled:opacity-50"
          >
            Start Consultation
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <h2 className="text-2xl font-display text-hermes-gold mb-4">Consult HERMES</h2>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-hermes-card border border-hermes-border rounded-lg p-4 space-y-4 mb-4">
        {messages.length === 0 && (
          <div className="text-center py-12 space-y-6">
            <p className="text-hermes-gold font-display text-xl">Welcome, Daniel.</p>
            <p className="text-hermes-muted text-sm">
              I have your complete health record loaded. What would you like to discuss?
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="px-3 py-2 bg-hermes-surface border border-hermes-border rounded text-sm text-hermes-muted hover:border-hermes-gold hover:text-hermes-text transition-all text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg p-4 ${
              msg.role === 'user'
                ? 'bg-hermes-gold/20 border border-hermes-gold/30 text-hermes-text'
                : 'bg-hermes-surface border border-hermes-border text-hermes-text'
            }`}>
              {msg.role === 'assistant' && (
                <p className="text-hermes-gold font-ui text-xs mb-2 tracking-wide">HERMES</p>
              )}
              <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-hermes-surface border border-hermes-border rounded-lg p-4">
              <p className="text-hermes-gold font-ui text-xs mb-2 tracking-wide">HERMES</p>
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-hermes-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-hermes-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-hermes-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-3">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
          placeholder="Ask HERMES anything about your health data..."
          disabled={loading}
          className="flex-1 bg-hermes-surface border border-hermes-border rounded-lg px-4 py-3 font-ui text-sm text-hermes-text placeholder-hermes-muted focus:border-hermes-gold focus:outline-none disabled:opacity-50"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          className="px-6 py-3 bg-hermes-gold text-hermes-bg rounded-lg font-ui text-sm font-bold hover:bg-yellow-500 transition-colors disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  )
}
