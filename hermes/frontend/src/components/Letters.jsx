import React, { useState } from 'react'
import { Mail, Copy, Check } from 'lucide-react'

const DOCTORS = [
  { name: 'Dr. Catherine Dos Santos', role: 'Primary Physician' },
  { name: 'Other', role: 'Specify in letter purpose' },
]

export default function Letters({ data }) {
  const [purpose, setPurpose] = useState('')
  const [doctor, setDoctor] = useState(DOCTORS[0].name)
  const [letter, setLetter] = useState(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const generateLetter = async () => {
    if (!purpose.trim()) return
    setLoading(true)

    const apiKey = prompt('Enter your Anthropic API key:')
    if (!apiKey) {
      setLoading(false)
      return
    }

    try {
      const findings = data.findings.map(f =>
        `${f.date}: ${f.test_name} = ${f.value} ${f.unit} (ref: ${f.reference_range}) [${f.flag}] — ${f.source}`
      ).join('\n')

      const protocols = data.protocols.map(p =>
        `${p.name}: ${p.purpose} (targets: ${p.targets?.join(', ')})`
      ).join('\n')

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
          system: `You are HERMES, generating a physician letter for Daniel M. Phend, ND, MH (Naturopathic Doctor, Master Herbalist, 40+ years clinical experience, Future Body Sciences, La Porte, Indiana).

Write a professional, collaborative physician letter addressed to ${doctor}. The letter should:
1. Include specific documented lab values with dates
2. Reference peer-reviewed studies to support clinical points
3. Use collaborative framing ("I value your perspective on...", "I'd appreciate your clinical assessment of...")
4. Include prioritized test/referral requests
5. Be formatted as a proper physician letter with date, salutation, body, and signature
6. Maintain a tone that is professional, evidence-based, and collegially respectful

Patient's documented findings:
${findings}

Current herbal protocols:
${protocols}

Return the complete formatted letter text.`,
          messages: [{
            role: 'user',
            content: `Generate a physician letter with this focus:\n\n${purpose}`
          }]
        })
      })

      if (!response.ok) throw new Error(`API error: ${response.status}`)

      const result = await response.json()
      setLetter(result.content[0].text)
    } catch (err) {
      alert(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (letter) {
      navigator.clipboard.writeText(letter)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <h2 className="text-xl font-display text-hermes-gold">Doctor Letter Generator</h2>

      <div className="bg-hermes-card border border-hermes-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl gradient-pink">
            <Mail size={18} className="text-pink-200" />
          </div>
          <p className="text-hermes-muted text-sm">Generate professional physician letters with your data.</p>
        </div>

        <div>
          <label className="font-ui text-[10px] text-hermes-muted tracking-wider block mb-1.5">RECIPIENT</label>
          <select
            value={doctor}
            onChange={e => setDoctor(e.target.value)}
            className="bg-hermes-surface border border-hermes-border rounded-xl px-4 py-2.5 font-ui text-sm text-hermes-text focus:border-hermes-gold focus:outline-none w-full"
          >
            {DOCTORS.map(d => (
              <option key={d.name} value={d.name}>{d.name} — {d.role}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="font-ui text-[10px] text-hermes-muted tracking-wider block mb-1.5">PURPOSE / FOCUS</label>
          <textarea
            value={purpose}
            onChange={e => setPurpose(e.target.value)}
            placeholder="Describe the purpose of this letter..."
            rows={4}
            className="w-full bg-hermes-surface border border-hermes-border rounded-xl p-4 font-ui text-sm text-hermes-text placeholder-hermes-muted focus:border-hermes-gold focus:outline-none resize-y"
          />
        </div>

        <button
          onClick={generateLetter}
          disabled={loading || !purpose.trim()}
          className="px-5 py-2.5 gradient-gold text-hermes-bg rounded-xl font-ui text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate Letter'}
        </button>
      </div>

      {letter && (
        <div className="bg-hermes-card border border-hermes-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base text-hermes-gold">Generated Letter</h3>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 px-4 py-2 bg-hermes-surface border border-hermes-border rounded-xl font-ui text-xs text-hermes-muted hover:border-hermes-gold transition-colors"
            >
              {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="bg-hermes-surface rounded-xl p-5 whitespace-pre-wrap font-display text-sm leading-relaxed">
            {letter}
          </div>
        </div>
      )}
    </div>
  )
}
