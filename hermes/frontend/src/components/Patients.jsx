import React, { useState, useRef } from 'react'
import {
  Search, FolderOpen, FileText, File, ExternalLink, ArrowLeft,
  Sparkles, Copy, Check, Users, AlertCircle,
} from 'lucide-react'
import { api, ApiError } from '../lib/api'

const KIND_STYLE = {
  pdf: { icon: File, color: '#E06B9F', label: 'PDF' },
  doc: { icon: FileText, color: '#4A8FD4', label: 'Doc' },
  word: { icon: FileText, color: '#3ABFBF', label: 'Word' },
  folder: { icon: FolderOpen, color: '#D4A843', label: 'Folder' },
  other: { icon: File, color: '#6B82A0', label: 'File' },
}

const shortDate = (iso) => (iso ? iso.split('T')[0] : '')

export default function Patients() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Drill-down state: an opened folder, and an opened document.
  const [folder, setFolder] = useState(null)
  const [folderFiles, setFolderFiles] = useState([])
  const [doc, setDoc] = useState(null)

  const abortRef = useRef(null)

  const runSearch = async (term) => {
    const q = (term ?? query).trim()
    if (q.length < 2) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)
    setFolder(null)
    setDoc(null)

    try {
      const data = await api.searchPatients(q, { signal: controller.signal })
      setResults(data)
    } catch (err) {
      if (err.name === 'AbortError') return
      setError(err instanceof ApiError ? err.message : String(err))
      setResults(null)
    } finally {
      setLoading(false)
    }
  }

  const openFolder = async (f) => {
    setLoading(true)
    setError(null)
    setDoc(null)
    try {
      const data = await api.patientFolderFiles(f.id)
      setFolder(f)
      setFolderFiles(data.files || [])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const openDoc = async (file) => {
    if (!file.readable) {
      window.open(file.link, '_blank', 'noopener,noreferrer')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await api.fileText(file.id)
      setDoc(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  // ── Document reader ──────────────────────────────────────────────────────
  if (doc) {
    return <DocumentView doc={doc} onBack={() => setDoc(null)} />
  }

  // ── Folder contents ──────────────────────────────────────────────────────
  if (folder) {
    return (
      <div className="space-y-4 animate-fade-in">
        <button
          onClick={() => setFolder(null)}
          className="flex items-center gap-1.5 text-hermes-muted font-ui text-xs hover:text-hermes-gold transition-colors"
        >
          <ArrowLeft size={14} /> Back to search
        </button>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl gradient-gold">
            <FolderOpen size={18} className="text-yellow-900" />
          </div>
          <div>
            <h2 className="text-lg font-display text-hermes-gold">{folder.name}</h2>
            <p className="font-ui text-[10px] text-hermes-muted">
              {folderFiles.length} {folderFiles.length === 1 ? 'item' : 'items'}
            </p>
          </div>
        </div>

        {error && <ErrorPanel message={error} />}
        {loading && <LoadingPanel label="Opening..." />}

        <div className="space-y-2">
          {folderFiles.map(f => (
            <FileRow key={f.id} file={f} onOpen={() => openDoc(f)} />
          ))}
          {!loading && folderFiles.length === 0 && (
            <EmptyPanel message="This folder is empty." />
          )}
        </div>
      </div>
    )
  }

  // ── Search ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl gradient-blue">
          <Users size={18} className="text-blue-200" />
        </div>
        <div>
          <h2 className="text-xl font-display text-hermes-gold">Patient Records</h2>
          <p className="text-hermes-muted text-xs">Search your Google Drive by patient name.</p>
        </div>
      </div>

      <div className="bg-hermes-card border border-hermes-border rounded-2xl p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-hermes-muted" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') runSearch() }}
              placeholder="Type a patient's name..."
              className="w-full bg-hermes-surface border border-hermes-border rounded-xl pl-10 pr-4 py-2.5 font-ui text-sm text-hermes-text placeholder-hermes-muted focus:border-hermes-gold focus:outline-none"
            />
          </div>
          <button
            onClick={() => runSearch()}
            disabled={loading || query.trim().length < 2}
            className="px-5 py-2.5 gradient-gold text-hermes-bg rounded-xl font-ui text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
        <p className="font-ui text-[10px] text-hermes-muted">
          Searches folder names and file names across your whole Drive.
        </p>
      </div>

      {error && <ErrorPanel message={error} />}
      {loading && !results && <LoadingPanel label="Searching your Drive..." />}

      {results && (
        <>
          {results.folders.length > 0 && (
            <div className="space-y-2">
              <p className="font-ui text-[10px] text-hermes-muted tracking-wider">
                PATIENT FOLDERS ({results.folders.length})
              </p>
              {results.folders.map(f => (
                <button
                  key={f.id}
                  onClick={() => openFolder(f)}
                  className="w-full bg-hermes-card border border-hermes-border rounded-2xl p-4 flex items-center gap-3 text-left hover:border-hermes-gold/40 transition-all card-glow"
                >
                  <div className="p-2 rounded-xl bg-hermes-gold/10">
                    <FolderOpen size={18} className="text-hermes-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-hermes-text text-sm font-bold truncate">{f.name}</p>
                    <p className="font-ui text-[10px] text-hermes-muted">
                      Updated {shortDate(f.modified)}
                    </p>
                  </div>
                  <span className="font-ui text-[10px] text-hermes-gold">Open</span>
                </button>
              ))}
            </div>
          )}

          {results.files.length > 0 && (
            <div className="space-y-2">
              <p className="font-ui text-[10px] text-hermes-muted tracking-wider">
                MATCHING FILES ({results.files.length})
              </p>
              {results.files.map(f => (
                <FileRow key={f.id} file={f} onOpen={() => openDoc(f)} />
              ))}
            </div>
          )}

          {results.folders.length === 0 && results.files.length === 0 && (
            <EmptyPanel message={`Nothing in your Drive matches "${results.query}".`} />
          )}
        </>
      )}

      {!results && !loading && !error && (
        <div className="bg-hermes-card border border-hermes-border rounded-2xl p-10 text-center">
          <div className="gradient-blue w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Search size={24} className="text-blue-200" />
          </div>
          <p className="text-hermes-text text-base">Look up a patient</p>
          <p className="text-hermes-muted text-sm mt-2">
            Type a name above to pull up every folder and file for them.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Document reader with AI summary ──────────────────────────────────────

function DocumentView({ doc, onBack }) {
  const [summary, setSummary] = useState(null)
  const [summarizing, setSummarizing] = useState(false)
  const [copied, setCopied] = useState(false)

  const summarize = async () => {
    const apiKey = prompt('Enter your Anthropic API key:')
    if (!apiKey) return

    setSummarizing(true)
    setSummary(null)
    try {
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
          system:
            'You are HERMES, clinical assistant to Daniel M. Phend, ND, MH — a naturopathic doctor and master herbalist. ' +
            'Summarize this patient document for a practitioner reviewing it before a consult. Give: (1) a one-paragraph overview, ' +
            '(2) key findings with any values and dates, (3) anything abnormal or flagged, (4) open questions worth following up. ' +
            'Be precise and concise. Do not invent values that are not in the document — if something is unclear, say so.',
          messages: [{
            role: 'user',
            content: `Document: ${doc.name}\n\n${doc.text}`,
          }],
        }),
      })
      if (!response.ok) throw new Error(`API error: ${response.status}`)
      const result = await response.json()
      setSummary(result.content[0].text)
    } catch (err) {
      setSummary(`Error: ${err.message}`)
    } finally {
      setSummarizing(false)
    }
  }

  const copyText = () => {
    navigator.clipboard.writeText(doc.text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-hermes-muted font-ui text-xs hover:text-hermes-gold transition-colors"
      >
        <ArrowLeft size={14} /> Back
      </button>

      <div className="bg-hermes-card border border-hermes-border rounded-2xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-display text-hermes-gold truncate">{doc.name}</h2>
            <p className="font-ui text-[10px] text-hermes-muted mt-0.5">
              {shortDate(doc.modified)} &middot; {doc.characters.toLocaleString()} characters
              {doc.truncated && ' (showing the first part)'}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={copyText}
              className="flex items-center gap-1.5 px-3 py-2 bg-hermes-surface border border-hermes-border rounded-xl font-ui text-xs text-hermes-muted hover:border-hermes-gold transition-colors"
            >
              {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            {doc.link && (
              <a
                href={doc.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 bg-hermes-surface border border-hermes-border rounded-xl font-ui text-xs text-hermes-muted hover:border-hermes-gold transition-colors"
              >
                <ExternalLink size={14} /> Drive
              </a>
            )}
          </div>
        </div>

        <button
          onClick={summarize}
          disabled={summarizing}
          className="flex items-center gap-1.5 px-5 py-2.5 gradient-gold text-hermes-bg rounded-xl font-ui text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Sparkles size={14} />
          {summarizing ? 'Reading...' : 'Summarize with HERMES'}
        </button>

        {summary && (
          <div className="bg-hermes-surface rounded-xl p-4 border-l-2 border-hermes-gold">
            <p className="font-ui text-[10px] text-hermes-gold tracking-wider mb-2 font-bold">
              HERMES SUMMARY
            </p>
            <div className="text-sm whitespace-pre-wrap leading-relaxed">{summary}</div>
          </div>
        )}
      </div>

      <div className="bg-hermes-card border border-hermes-border rounded-2xl p-5">
        <p className="font-ui text-[10px] text-hermes-muted tracking-wider mb-3">DOCUMENT TEXT</p>
        <div className="bg-hermes-surface rounded-xl p-4 max-h-[500px] overflow-y-auto">
          <pre className="text-sm whitespace-pre-wrap font-ui leading-relaxed text-hermes-text">
            {doc.text}
          </pre>
        </div>
      </div>
    </div>
  )
}

// ─── Shared pieces ────────────────────────────────────────────────────────

function FileRow({ file, onOpen }) {
  const style = KIND_STYLE[file.kind] || KIND_STYLE.other
  const Icon = style.icon

  return (
    <div className="bg-hermes-card border border-hermes-border rounded-2xl p-4 flex items-center gap-3 hover:border-hermes-gold/30 transition-all card-glow">
      <div className="p-2 rounded-xl bg-hermes-surface">
        <Icon size={16} color={style.color} />
      </div>
      <button onClick={onOpen} className="flex-1 min-w-0 text-left">
        <p className="text-hermes-text text-sm truncate">{file.name}</p>
        <p className="font-ui text-[10px] text-hermes-muted">
          {style.label} &middot; {shortDate(file.modified)}
        </p>
      </button>
      <div className="flex items-center gap-2 shrink-0">
        {file.readable && (
          <button
            onClick={onOpen}
            className="font-ui text-[10px] text-hermes-gold hover:underline"
          >
            Read
          </button>
        )}
        {file.link && (
          <a
            href={file.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-hermes-muted hover:text-hermes-gold transition-colors"
          >
            <ExternalLink size={14} />
          </a>
        )}
      </div>
    </div>
  )
}

function ErrorPanel({ message }) {
  return (
    <div className="bg-red-950/30 border border-red-800/50 rounded-2xl p-4 flex items-start gap-3">
      <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
      <p className="text-red-300 text-sm leading-relaxed">{message}</p>
    </div>
  )
}

function LoadingPanel({ label }) {
  return (
    <div className="bg-hermes-card border border-hermes-border rounded-2xl p-8 text-center">
      <div className="flex justify-center gap-1.5 mb-3">
        <span className="w-2 h-2 bg-hermes-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-hermes-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-hermes-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <p className="text-hermes-muted font-ui text-xs">{label}</p>
    </div>
  )
}

function EmptyPanel({ message }) {
  return (
    <div className="bg-hermes-card border border-hermes-border rounded-2xl p-8 text-center">
      <p className="text-hermes-muted text-sm">{message}</p>
    </div>
  )
}
