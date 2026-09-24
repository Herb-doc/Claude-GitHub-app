import React, { useState } from 'react'
import {
  Globe,
  Mail,
  FolderOpen,
  FileText,
  Calendar,
  BookOpen,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  PenLine,
  Activity,
  Leaf,
  MapPin,
} from 'lucide-react'

const QUICK_LINKS = [
  {
    label: 'aboutyourbody.net',
    desc: 'Your practice website',
    url: 'https://aboutyourbody.net',
    icon: Globe,
    gradient: 'gradient-gold',
    iconColor: '#3A2C0A',
    labelColor: 'text-black/70',
    valueColor: 'text-black',
  },
  {
    label: 'Gmail',
    desc: 'Patient & practice mail',
    url: 'https://mail.google.com',
    icon: Mail,
    gradient: 'gradient-pink',
    iconColor: '#F5B8D4',
  },
  {
    label: 'Drive',
    desc: 'Files & patient records',
    url: 'https://drive.google.com',
    icon: FolderOpen,
    gradient: 'gradient-green',
    iconColor: '#9FF0BE',
  },
  {
    label: 'Docs',
    desc: 'Drafts & handouts',
    url: 'https://docs.google.com',
    icon: FileText,
    gradient: 'gradient-blue',
    iconColor: '#A8D2FA',
  },
  {
    label: 'Calendar',
    desc: 'Appointments & schedule',
    url: 'https://calendar.google.com',
    icon: Calendar,
    gradient: 'gradient-orange',
    iconColor: '#F7CFA6',
  },
  {
    label: 'PubMed',
    desc: 'Peer-reviewed research',
    url: 'https://pubmed.ncbi.nlm.nih.gov',
    icon: BookOpen,
    gradient: 'gradient-purple',
    iconColor: '#D2C4FF',
  },
]

const CONTENT_TYPES = [
  {
    id: 'Blog Post',
    hint: '700-1000 words, section headings, an inviting opening and a closing takeaway.',
  },
  {
    id: 'Patient Education Handout',
    hint: 'One page, plain language, scannable bullets, a "what to do next" section.',
  },
  {
    id: 'Service Page',
    hint: 'Website page copy: who it helps, what happens in a visit, what to expect, a clear next step.',
  },
  {
    id: 'Newsletter',
    hint: 'Short, personal, one central idea, subject line plus body.',
  },
  {
    id: 'Social Post',
    hint: '3 short variants under 120 words each, no hashtags spam, one clear idea per post.',
  },
  {
    id: 'FAQ Entry',
    hint: 'A single question with a direct, complete answer in 150-250 words.',
  },
]

const TONES = [
  { id: 'Warm & Accessible', hint: 'Conversational and reassuring; explain terms as you use them.' },
  { id: 'Clinical & Precise', hint: 'Professional and specific; use correct terminology and mechanism.' },
  { id: 'Educational', hint: 'Teach step by step; build understanding from first principles.' },
]

export default function Website({ data }) {
  const findings = data?.findings || []
  const protocols = data?.protocols || []
  const metadata = data?.metadata || {}
  const activeProtocols = protocols.filter(p => p.status === 'active')

  const [contentType, setContentType] = useState(CONTENT_TYPES[0].id)
  const [topic, setTopic] = useState('')
  const [keyPoints, setKeyPoints] = useState('')
  const [tone, setTone] = useState(TONES[0].id)
  const [draft, setDraft] = useState(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const typeHint = CONTENT_TYPES.find(t => t.id === contentType)?.hint || ''
  const toneHint = TONES.find(t => t.id === tone)?.hint || ''

  const draftContent = async () => {
    if (!topic.trim()) return
    setLoading(true)

    const apiKey = prompt('Enter your Anthropic API key:')
    if (!apiKey) {
      setLoading(false)
      return
    }

    try {
      const protocolContext = activeProtocols
        .map(p => `${p.name}: ${p.purpose}`)
        .join('\n')

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
          system: `You are HERMES, drafting public-facing website and practice content for Daniel M. Phend, ND, MH — a Naturopathic Doctor and Master Herbalist with 40+ years of clinical experience, specializing in immune and autoimmune disorders. His practice is ${metadata.practice || 'About Your Body LLC'} in ${metadata.location || 'Goshen, Indiana'}, online at aboutyourbody.net.

VOICE AND STANDARDS
- Write in his voice: naturopathic and botanical medicine grounded in evidence, spoken by an experienced clinician who respects the reader's intelligence.
- Whole-person, root-cause framing — but never anti-medicine or conspiratorial. Conventional care and collaborative physician relationships are treated with respect.
- Where a clinical claim is made, cite supporting peer-reviewed research inline (author/journal/year, and PMID where you are confident of it). If you are not confident a citation is real, state the strength of evidence in plain language instead of inventing a reference. Never fabricate citations, PMIDs, or study results.
- Distinguish clearly between well-established findings, preliminary evidence, and traditional use.

BOUNDARIES
- This is general education for a public audience. Never give individualized medical advice, never diagnose a reader, and never instruct a reader to start, stop, or change a medication.
- Herb-drug interaction and safety cautions must be mentioned whenever a specific botanical is named.
- For patient-facing content, end with a brief disclaimer noting the content is educational, is not a substitute for individualized care, and that readers should consult a qualified practitioner — especially if pregnant, nursing, or taking prescription medication.

FORMAT
- Content type: ${contentType}. ${typeHint}
- Tone: ${tone}. ${toneHint}
- Return finished, ready-to-publish copy only — no meta commentary, no notes to the author, no explanation of your choices.

PRACTICE CONTEXT (background only — do not disclose patient data or present it as case material)
Active clinical focus areas in this practice:
${protocolContext || 'Immune and autoimmune support through botanical medicine.'}`,
          messages: [{
            role: 'user',
            content: `Draft a ${contentType} for ${metadata.practice || 'About Your Body LLC'}.

TOPIC: ${topic}${keyPoints.trim() ? `\n\nKEY POINTS TO COVER:\n${keyPoints}` : ''}`
          }]
        })
      })

      if (!response.ok) throw new Error(`API error: ${response.status}`)

      const result = await response.json()
      setDraft(result.content[0].text)
    } catch (err) {
      alert(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (draft) {
      navigator.clipboard.writeText(draft)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Quick Links ───────────────────────────────── */}
      <div>
        <h2 className="text-xl font-display text-hermes-gold mb-3">Practice Links</h2>
        <div className="grid grid-cols-2 gap-3">
          {QUICK_LINKS.map(link => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${link.gradient} rounded-2xl p-4 card-glow transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] block`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-xl bg-white/10">
                  <link.icon size={20} color={link.iconColor} />
                </div>
                <ExternalLink size={13} className={link.labelColor || 'text-white/40'} />
              </div>
              <p className={`text-sm font-medium truncate ${link.valueColor || 'text-white'}`}>
                {link.label}
              </p>
              <p className={`font-ui text-[10px] mt-0.5 truncate ${link.labelColor || 'text-white/60'}`}>
                {link.desc}
              </p>
            </a>
          ))}
        </div>
      </div>

      {/* ── Content Studio ────────────────────────────── */}
      <div className="bg-hermes-card border border-hermes-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl gradient-purple">
            <PenLine size={18} className="text-purple-200" />
          </div>
          <div>
            <h2 className="text-xl font-display text-hermes-gold leading-tight">Content Studio</h2>
            <p className="text-hermes-muted text-sm">Draft website content with HERMES.</p>
          </div>
        </div>

        <div>
          <label className="font-ui text-[10px] text-hermes-muted tracking-wider block mb-1.5">CONTENT TYPE</label>
          <div className="flex flex-wrap gap-2">
            {CONTENT_TYPES.map(t => (
              <button
                key={t.id}
                onClick={() => setContentType(t.id)}
                className={`px-3 py-2 rounded-xl font-ui text-xs border transition-colors ${
                  contentType === t.id
                    ? 'bg-hermes-gold/15 border-hermes-gold text-hermes-gold'
                    : 'bg-hermes-surface border-hermes-border text-hermes-muted hover:border-hermes-gold/50'
                }`}
              >
                {t.id}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="font-ui text-[10px] text-hermes-muted tracking-wider block mb-1.5">TOPIC / SUBJECT</label>
          <input
            type="text"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="e.g. Astragalus and immune resilience"
            className="w-full bg-hermes-surface border border-hermes-border rounded-xl px-4 py-2.5 font-ui text-sm text-hermes-text placeholder-hermes-muted focus:border-hermes-gold focus:outline-none"
          />
        </div>

        <div>
          <label className="font-ui text-[10px] text-hermes-muted tracking-wider block mb-1.5">
            KEY POINTS TO COVER <span className="text-hermes-muted/60">(OPTIONAL)</span>
          </label>
          <textarea
            value={keyPoints}
            onChange={e => setKeyPoints(e.target.value)}
            placeholder="One point per line — mechanisms, studies, cautions, the message you want readers to leave with..."
            rows={4}
            className="w-full bg-hermes-surface border border-hermes-border rounded-xl p-4 font-ui text-sm text-hermes-text placeholder-hermes-muted focus:border-hermes-gold focus:outline-none resize-y"
          />
        </div>

        <div>
          <label className="font-ui text-[10px] text-hermes-muted tracking-wider block mb-1.5">TONE</label>
          <div className="grid grid-cols-3 gap-2">
            {TONES.map(t => (
              <button
                key={t.id}
                onClick={() => setTone(t.id)}
                className={`px-3 py-2 rounded-xl font-ui text-xs border transition-colors ${
                  tone === t.id
                    ? 'bg-hermes-teal/15 border-hermes-teal text-hermes-teal'
                    : 'bg-hermes-surface border-hermes-border text-hermes-muted hover:border-hermes-teal/50'
                }`}
              >
                {t.id}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={draftContent}
            disabled={loading || !topic.trim()}
            className="flex items-center gap-2 px-5 py-2.5 gradient-gold text-hermes-bg rounded-xl font-ui text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Sparkles size={15} />
            {loading ? 'Drafting...' : 'Draft Content'}
          </button>
          <p className="font-ui text-[10px] text-hermes-muted tracking-wider">
            {contentType.toUpperCase()} &middot; {tone.toUpperCase()}
          </p>
        </div>
      </div>

      {draft && (
        <div className="bg-hermes-card border border-hermes-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-base text-hermes-gold">Draft — {contentType}</h3>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 px-4 py-2 bg-hermes-surface border border-hermes-border rounded-xl font-ui text-xs text-hermes-muted hover:border-hermes-gold transition-colors shrink-0"
            >
              {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="bg-hermes-surface rounded-xl p-5 whitespace-pre-wrap font-display text-sm leading-relaxed">
            {draft}
          </div>
          <p className="font-ui text-[10px] text-hermes-muted tracking-wider">
            REVIEW EVERY CLINICAL CLAIM AND CITATION BEFORE PUBLISHING.
          </p>
        </div>
      )}

      {/* ── Practice Snapshot ─────────────────────────── */}
      <div>
        <h2 className="text-xl font-display text-hermes-gold mb-3">Practice Snapshot</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Findings"
            value={findings.length}
            icon={Activity}
            gradient="gradient-blue"
            iconColor="#6DB3F8"
          />
          <StatCard
            label="Active Protocols"
            value={activeProtocols.length}
            icon={Leaf}
            gradient="gradient-green"
            iconColor="#72E49A"
          />
        </div>

        <div className="bg-hermes-card border border-hermes-border rounded-2xl p-5 mt-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl gradient-teal shrink-0">
              <MapPin size={18} className="text-teal-200" />
            </div>
            <div className="min-w-0">
              <p className="font-ui text-[10px] text-hermes-muted tracking-wider">PRACTICE</p>
              <p className="text-hermes-text text-sm font-medium truncate">
                {metadata.practice || 'About Your Body LLC'}
              </p>
              <p className="text-hermes-muted text-xs truncate">
                {metadata.location || 'Goshen, Indiana'} &middot; aboutyourbody.net
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-hermes-muted font-ui text-[10px] mt-3 pb-2">
          {metadata.patient_name || 'Daniel M. Phend, ND, MH'} &middot; Last sync{' '}
          {metadata.last_sync?.split('T')[0] || 'Never'}
        </p>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, gradient, iconColor }) {
  return (
    <div className={`${gradient} rounded-2xl p-4 card-glow transition-all duration-200`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white/60 font-ui text-[10px] tracking-wider uppercase">{label}</p>
          <p className="text-white text-3xl font-display font-bold mt-1">{value}</p>
        </div>
        <div className="p-2 rounded-xl bg-white/10">
          <Icon size={20} color={iconColor} />
        </div>
      </div>
    </div>
  )
}
