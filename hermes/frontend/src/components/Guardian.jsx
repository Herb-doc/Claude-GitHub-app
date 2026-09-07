import React, { useState, useEffect, useCallback } from 'react'
import {
  ShieldCheck, ShieldAlert, RefreshCw, Copy, Check,
  CheckCircle2, XCircle, AlertTriangle, Terminal,
} from 'lucide-react'
import { api, ApiError } from '../lib/api'

const STATUS = {
  ok: { icon: CheckCircle2, color: '#52C47A', label: 'OK' },
  warn: { icon: AlertTriangle, color: '#E08030', label: 'CHECK' },
  fail: { icon: XCircle, color: '#FF4444', label: 'NEEDS FIXING' },
}

const COMMANDS = [
  {
    label: 'Run a full system check',
    command: 'python guardian.py',
    where: 'hermes\\guardian',
  },
  {
    label: 'Check and fix what it safely can',
    command: 'python guardian.py --repair',
    where: 'hermes\\guardian',
  },
  {
    label: 'See the history of past problems',
    command: 'python guardian.py --history',
    where: 'hermes\\guardian',
  },
  {
    label: 'Start the backend server',
    command: 'python server.py',
    where: 'hermes\\server',
  },
  {
    label: 'Sign in to Google',
    command: 'python authorize.py',
    where: 'hermes\\server',
  },
]

export default function Guardian({ data }) {
  const [health, setHealth] = useState(null)
  const [state, setState] = useState({ loading: true, error: null })

  const check = useCallback(async () => {
    setState({ loading: true, error: null })
    try {
      setHealth(await api.health())
      setState({ loading: false, error: null })
    } catch (err) {
      setHealth(null)
      setState({ loading: false, error: err instanceof ApiError ? err.message : String(err) })
    }
  }, [])

  useEffect(() => { check() }, [check])

  const findings = data?.findings || []
  const protocols = data?.protocols || []

  const checks = [
    {
      name: 'Dashboard',
      status: 'ok',
      detail: 'Running in your browser right now.',
    },
    {
      name: 'Health record',
      status: findings.length > 0 ? 'ok' : 'warn',
      detail: findings.length > 0
        ? `${findings.length} findings, ${protocols.length} protocols loaded.`
        : 'No findings loaded. The data file may be empty.',
    },
    {
      name: 'Backend server',
      status: state.error ? 'fail' : health ? 'ok' : 'warn',
      detail: state.error
        ? 'Not running. Patient search and Workspace need it.'
        : health
          ? 'Running and reachable.'
          : 'Checking...',
      fix: state.error ? 'python server.py' : null,
    },
    {
      name: 'Google sign-in',
      status: !health ? 'warn' : health.google?.signed_in ? 'ok' : 'fail',
      detail: !health
        ? 'Cannot check while the backend is down.'
        : health.google?.message || 'Unknown.',
      fix: health && !health.google?.signed_in ? 'python authorize.py' : null,
    },
  ]

  const failing = checks.filter(c => c.status === 'fail').length
  const warning = checks.filter(c => c.status === 'warn').length
  const allGood = failing === 0 && warning === 0

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${allGood ? 'gradient-green' : failing ? 'gradient-red' : 'gradient-orange'}`}>
            {allGood
              ? <ShieldCheck size={18} className="text-green-200" />
              : <ShieldAlert size={18} className={failing ? 'text-red-200' : 'text-orange-200'} />}
          </div>
          <div>
            <h2 className="text-xl font-display text-hermes-gold">Guardian</h2>
            <p className="text-hermes-muted text-xs">Watches over your HERMES system.</p>
          </div>
        </div>
        <button
          onClick={check}
          disabled={state.loading}
          className="p-2.5 bg-hermes-surface border border-hermes-border rounded-xl text-hermes-muted hover:border-hermes-gold transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={state.loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Overall banner */}
      <div className={`rounded-2xl p-5 ${allGood ? 'gradient-green' : failing ? 'gradient-red' : 'gradient-orange'}`}>
        <p className="text-white/70 font-ui text-[10px] tracking-wider uppercase">System Status</p>
        <p className="text-white text-xl font-display font-bold mt-1">
          {allGood
            ? 'Everything is running'
            : failing
              ? `${failing} thing${failing === 1 ? '' : 's'} need${failing === 1 ? 's' : ''} fixing`
              : `${warning} thing${warning === 1 ? '' : 's'} to check`}
        </p>
        {!allGood && (
          <p className="text-white/70 text-xs mt-1">
            The steps below tell you exactly what to type.
          </p>
        )}
      </div>

      {/* Individual checks */}
      <div className="space-y-2">
        {checks.map((c, i) => {
          const s = STATUS[c.status]
          const Icon = s.icon
          return (
            <div key={i} className="bg-hermes-card border border-hermes-border rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <Icon size={18} color={s.color} className="shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-hermes-text text-sm font-bold">{c.name}</p>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-ui font-medium"
                      style={{ backgroundColor: `${s.color}22`, color: s.color }}
                    >
                      {s.label}
                    </span>
                  </div>
                  <p className="text-hermes-muted text-xs mt-1 leading-relaxed">{c.detail}</p>
                  {c.fix && <CommandLine command={c.fix} compact />}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Command reference */}
      <div className="bg-hermes-card border border-hermes-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl gradient-purple">
            <Terminal size={18} className="text-purple-200" />
          </div>
          <div>
            <h3 className="font-display text-base text-hermes-gold">Repair Commands</h3>
            <p className="text-hermes-muted text-xs">
              Open Command Prompt, go to the folder shown, then type the command.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {COMMANDS.map((c, i) => (
            <div key={i}>
              <p className="text-hermes-text text-xs mb-1">{c.label}</p>
              <p className="font-ui text-[10px] text-hermes-muted mb-1">Folder: {c.where}</p>
              <CommandLine command={c.command} />
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-hermes-muted font-ui text-[10px]">
        The Guardian script keeps a log of every problem and fix in guardian/repair_log.jsonl
      </p>
    </div>
  )
}

function CommandLine({ command, compact = false }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`flex items-center gap-2 bg-hermes-surface border border-hermes-border rounded-xl px-3 py-2 ${compact ? 'mt-2' : ''}`}>
      <code className="flex-1 font-ui text-xs text-hermes-gold truncate">{command}</code>
      <button
        onClick={copy}
        className="text-hermes-muted hover:text-hermes-gold transition-colors shrink-0"
        title="Copy command"
      >
        {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
      </button>
    </div>
  )
}
