import React, { useState, useEffect, useCallback } from 'react'
import {
  Mail, FolderOpen, FileText, Calendar, Search, ExternalLink,
  ArrowLeft, RefreshCw, AlertCircle, Inbox,
} from 'lucide-react'
import { api, ApiError } from '../lib/api'

const PANELS = [
  { key: 'mail', label: 'Mail', icon: Mail, color: '#E06B9F' },
  { key: 'drive', label: 'Drive', icon: FolderOpen, color: '#52C47A' },
  { key: 'docs', label: 'Docs', icon: FileText, color: '#4A8FD4' },
  { key: 'calendar', label: 'Calendar', icon: Calendar, color: '#E08030' },
]

const shortDate = (iso) => (iso ? String(iso).split('T')[0] : '')

const senderName = (from) => {
  if (!from) return 'Unknown'
  const match = from.match(/^\s*"?([^"<]+?)"?\s*</)
  return (match ? match[1] : from).trim()
}

export default function Workspace() {
  const [panel, setPanel] = useState('mail')

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl gradient-teal">
          <Inbox size={18} className="text-teal-200" />
        </div>
        <div>
          <h2 className="text-xl font-display text-hermes-gold">Workspace</h2>
          <p className="text-hermes-muted text-xs">Your Google mail, files and calendar.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {PANELS.map(p => {
          const Icon = p.icon
          const active = panel === p.key
          return (
            <button
              key={p.key}
              onClick={() => setPanel(p.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-ui text-xs transition-all duration-200 ${
                active
                  ? 'text-white font-bold shadow-lg'
                  : 'bg-hermes-surface border border-hermes-border text-hermes-muted hover:text-hermes-text hover:border-hermes-gold/50'
              }`}
              style={active ? { backgroundColor: p.color } : {}}
            >
              <Icon size={13} />
              {p.label}
            </button>
          )
        })}
      </div>

      {panel === 'mail' && <MailPanel />}
      {panel === 'drive' && <DrivePanel />}
      {panel === 'docs' && <DocsPanel />}
      {panel === 'calendar' && <CalendarPanel />}
    </div>
  )
}

// ─── Mail ─────────────────────────────────────────────────────────────────

function MailPanel() {
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState([])
  const [openMessage, setOpenMessage] = useState(null)
  const [state, setState] = useState({ loading: true, error: null })

  const load = useCallback(async (q = '') => {
    setState({ loading: true, error: null })
    try {
      const data = await api.gmailSearch(q)
      setMessages(data.messages || [])
      setState({ loading: false, error: null })
    } catch (err) {
      setState({ loading: false, error: err instanceof ApiError ? err.message : String(err) })
    }
  }, [])

  useEffect(() => { load() }, [load])

  const open = async (id) => {
    setState({ loading: true, error: null })
    try {
      setOpenMessage(await api.gmailMessage(id))
      setState({ loading: false, error: null })
    } catch (err) {
      setState({ loading: false, error: err instanceof ApiError ? err.message : String(err) })
    }
  }

  if (openMessage) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setOpenMessage(null)}
          className="flex items-center gap-1.5 text-hermes-muted font-ui text-xs hover:text-hermes-gold transition-colors"
        >
          <ArrowLeft size={14} /> Back to mail
        </button>
        <div className="bg-hermes-card border border-hermes-border rounded-2xl p-5 space-y-3">
          <h3 className="font-display text-base text-hermes-gold">{openMessage.subject}</h3>
          <div className="font-ui text-[10px] text-hermes-muted space-y-0.5">
            <p>From: {openMessage.from}</p>
            {openMessage.to && <p>To: {openMessage.to}</p>}
            <p>{openMessage.date}</p>
          </div>
          <div className="bg-hermes-surface rounded-xl p-4 max-h-[450px] overflow-y-auto">
            <pre className="text-sm whitespace-pre-wrap font-ui leading-relaxed text-hermes-text">
              {openMessage.body || '(no readable text in this message)'}
            </pre>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-hermes-muted" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') load(query) }}
            placeholder="Search mail, or leave blank for inbox..."
            className="w-full bg-hermes-surface border border-hermes-border rounded-xl pl-10 pr-4 py-2.5 font-ui text-sm text-hermes-text placeholder-hermes-muted focus:border-hermes-gold focus:outline-none"
          />
        </div>
        <button
          onClick={() => load(query)}
          className="px-4 py-2.5 bg-hermes-surface border border-hermes-border rounded-xl text-hermes-muted hover:border-hermes-gold transition-colors"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {state.error && <ErrorPanel message={state.error} />}
      {state.loading && <LoadingPanel label="Loading mail..." />}

      <div className="space-y-2">
        {messages.map(m => (
          <button
            key={m.id}
            onClick={() => open(m.id)}
            className="w-full bg-hermes-card border border-hermes-border rounded-2xl p-4 text-left hover:border-hermes-gold/30 transition-all card-glow"
          >
            <div className="flex items-center gap-2 mb-1">
              {m.unread && <span className="w-2 h-2 rounded-full bg-hermes-gold shrink-0" />}
              <p className={`text-sm truncate flex-1 ${m.unread ? 'text-hermes-text font-bold' : 'text-hermes-text'}`}>
                {m.subject}
              </p>
            </div>
            <p className="font-ui text-[10px] text-hermes-muted truncate">
              {senderName(m.from)}
            </p>
            <p className="text-hermes-muted text-xs mt-1 line-clamp-2">{m.snippet}</p>
          </button>
        ))}
        {!state.loading && !state.error && messages.length === 0 && (
          <EmptyPanel message="No messages found." />
        )}
      </div>
    </div>
  )
}

// ─── Drive ────────────────────────────────────────────────────────────────

function DrivePanel() {
  const [query, setQuery] = useState('')
  const [files, setFiles] = useState([])
  const [state, setState] = useState({ loading: true, error: null })

  const load = useCallback(async (q = '') => {
    setState({ loading: true, error: null })
    try {
      const data = q.trim().length >= 2
        ? await api.driveSearch(q.trim())
        : await api.driveRecent()
      setFiles(data.files || [])
      setState({ loading: false, error: null })
    } catch (err) {
      setState({ loading: false, error: err instanceof ApiError ? err.message : String(err) })
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-hermes-muted" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') load(query) }}
            placeholder="Search Drive, or leave blank for recent..."
            className="w-full bg-hermes-surface border border-hermes-border rounded-xl pl-10 pr-4 py-2.5 font-ui text-sm text-hermes-text placeholder-hermes-muted focus:border-hermes-gold focus:outline-none"
          />
        </div>
        <button
          onClick={() => load(query)}
          className="px-4 py-2.5 bg-hermes-surface border border-hermes-border rounded-xl text-hermes-muted hover:border-hermes-gold transition-colors"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {state.error && <ErrorPanel message={state.error} />}
      {state.loading && <LoadingPanel label="Loading files..." />}

      <div className="space-y-2">
        {files.map(f => <DriveRow key={f.id} file={f} />)}
        {!state.loading && !state.error && files.length === 0 && (
          <EmptyPanel message="No files found." />
        )}
      </div>
    </div>
  )
}

function DocsPanel() {
  const [files, setFiles] = useState([])
  const [state, setState] = useState({ loading: true, error: null })

  const load = useCallback(async () => {
    setState({ loading: true, error: null })
    try {
      const data = await api.docsRecent()
      setFiles(data.files || [])
      setState({ loading: false, error: null })
    } catch (err) {
      setState({ loading: false, error: err instanceof ApiError ? err.message : String(err) })
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-ui text-[10px] text-hermes-muted tracking-wider">RECENT GOOGLE DOCS</p>
        <button
          onClick={load}
          className="p-2 bg-hermes-surface border border-hermes-border rounded-xl text-hermes-muted hover:border-hermes-gold transition-colors"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {state.error && <ErrorPanel message={state.error} />}
      {state.loading && <LoadingPanel label="Loading documents..." />}

      <div className="space-y-2">
        {files.map(f => <DriveRow key={f.id} file={f} />)}
        {!state.loading && !state.error && files.length === 0 && (
          <EmptyPanel message="No documents found." />
        )}
      </div>
    </div>
  )
}

function CalendarPanel() {
  const [events, setEvents] = useState([])
  const [state, setState] = useState({ loading: true, error: null })

  const load = useCallback(async () => {
    setState({ loading: true, error: null })
    try {
      const data = await api.calendarUpcoming()
      setEvents(data.events || [])
      setState({ loading: false, error: null })
    } catch (err) {
      setState({ loading: false, error: err instanceof ApiError ? err.message : String(err) })
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-ui text-[10px] text-hermes-muted tracking-wider">UPCOMING</p>
        <button
          onClick={load}
          className="p-2 bg-hermes-surface border border-hermes-border rounded-xl text-hermes-muted hover:border-hermes-gold transition-colors"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {state.error && <ErrorPanel message={state.error} />}
      {state.loading && <LoadingPanel label="Loading calendar..." />}

      <div className="space-y-2">
        {events.map(e => (
          <div
            key={e.id}
            className="bg-hermes-card border border-hermes-border rounded-2xl p-4 flex items-center gap-3"
          >
            <div className="p-2 rounded-xl bg-orange-900/20">
              <Calendar size={16} className="text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-hermes-text text-sm truncate">{e.title}</p>
              <p className="font-ui text-[10px] text-hermes-muted">
                {e.all_day ? e.start : String(e.start).replace('T', ' ').slice(0, 16)}
                {e.location && ` · ${e.location}`}
              </p>
            </div>
            {e.link && (
              <a
                href={e.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-hermes-muted hover:text-hermes-gold transition-colors shrink-0"
              >
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        ))}
        {!state.loading && !state.error && events.length === 0 && (
          <EmptyPanel message="Nothing scheduled coming up." />
        )}
      </div>
    </div>
  )
}

// ─── Shared pieces ────────────────────────────────────────────────────────

const KIND_COLOR = { pdf: '#E06B9F', doc: '#4A8FD4', word: '#3ABFBF', folder: '#D4A843', other: '#6B82A0' }

function DriveRow({ file }) {
  const Icon = file.kind === 'folder' ? FolderOpen : FileText
  return (
    <div className="bg-hermes-card border border-hermes-border rounded-2xl p-4 flex items-center gap-3 hover:border-hermes-gold/30 transition-all card-glow">
      <div className="p-2 rounded-xl bg-hermes-surface">
        <Icon size={16} color={KIND_COLOR[file.kind] || KIND_COLOR.other} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-hermes-text text-sm truncate">{file.name}</p>
        <p className="font-ui text-[10px] text-hermes-muted">{shortDate(file.modified)}</p>
      </div>
      {file.link && (
        <a
          href={file.link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-hermes-muted hover:text-hermes-gold transition-colors shrink-0"
        >
          <ExternalLink size={14} />
        </a>
      )}
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
