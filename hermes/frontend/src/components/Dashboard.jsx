import React from 'react'

const FLAG_COLORS = {
  CRITICAL: 'bg-red-900/50 text-red-400 border-red-800',
  URGENT: 'bg-red-900/50 text-red-400 border-red-800',
  HIGH: 'bg-orange-900/50 text-orange-400 border-orange-800',
  LOW: 'bg-blue-900/50 text-blue-400 border-blue-800',
  WATCH: 'bg-yellow-900/50 text-yellow-400 border-yellow-800',
  NORMAL: 'bg-green-900/50 text-green-400 border-green-800',
}

export default function Dashboard({ data, onNavigate }) {
  const findings = data.findings || []
  const protocols = data.protocols || []

  const criticalFlags = findings.filter(f => ['CRITICAL', 'URGENT'].includes(f.flag))
  const activeIssues = findings.filter(f => f.status === 'active')
  const activeProtocols = protocols.filter(p => p.status === 'active')
  const recentFindings = findings.slice(0, 8)

  return (
    <div className="space-y-6">
      {/* Critical Flags Banner */}
      {criticalFlags.length > 0 && (
        <div className="bg-red-950/60 border border-red-800 rounded-lg p-4 pulse-alert">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-red-400 text-lg">&#9888;</span>
            <h3 className="text-red-400 font-ui text-sm font-bold tracking-wide">
              CRITICAL FLAGS ({criticalFlags.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {criticalFlags.map((f, i) => (
              <div key={i} className="flex items-center gap-3 bg-red-950/40 rounded p-2">
                <span className="text-red-400 font-ui text-xs font-bold">{f.date}</span>
                <span className="text-hermes-text text-sm">{f.test_name}</span>
                <span className="text-red-400 font-ui text-xs">
                  {f.value} {f.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Findings" value={findings.length} color="text-hermes-blue" />
        <StatCard label="Active Issues" value={activeIssues.length} color="text-hermes-high" />
        <StatCard label="Critical Flags" value={criticalFlags.length} color="text-hermes-critical" />
        <StatCard label="Active Protocols" value={activeProtocols.length} color="text-hermes-normal" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickAction label="Consult HERMES" icon="&#9741;" onClick={() => onNavigate('Consult')} />
        <QuickAction label="Upload Labs" icon="&#8682;" onClick={() => onNavigate('Analyze')} />
        <QuickAction label="Generate Letter" icon="&#9993;" onClick={() => onNavigate('Letters')} />
        <QuickAction label="View Trends" icon="&#8599;" onClick={() => onNavigate('Trends')} />
      </div>

      {/* Recent Activity */}
      <div className="bg-hermes-card border border-hermes-border rounded-lg p-5">
        <h3 className="text-hermes-gold font-display text-lg mb-4">Recent Activity</h3>
        <div className="space-y-2">
          {recentFindings.map((f, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-hermes-border/50 last:border-0">
              <div className="flex items-center gap-3">
                <span className="text-hermes-muted font-ui text-xs w-24">{f.date}</span>
                <span className="text-hermes-text text-sm">{f.test_name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-hermes-muted font-ui text-xs">
                  {f.value} {f.unit}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-ui border ${FLAG_COLORS[f.flag] || FLAG_COLORS.NORMAL}`}>
                  {f.flag}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Metadata */}
      <div className="text-center text-hermes-muted font-ui text-xs">
        Last sync: {data.metadata?.last_sync || 'Never'} &middot;
        Patient: {data.metadata?.patient_name || 'Unknown'} &middot;
        Primary: {data.metadata?.primary_physician || 'Unknown'}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-hermes-card border border-hermes-border rounded-lg p-4">
      <p className="text-hermes-muted font-ui text-xs tracking-wide mb-1">{label.toUpperCase()}</p>
      <p className={`text-3xl font-display font-bold ${color}`}>{value}</p>
    </div>
  )
}

function QuickAction({ label, icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-hermes-surface border border-hermes-border rounded-lg p-4 text-center hover:border-hermes-gold hover:bg-hermes-card transition-all duration-200 group"
    >
      <span className="text-2xl block mb-1 group-hover:text-hermes-gold transition-colors">{icon}</span>
      <span className="font-ui text-xs text-hermes-muted group-hover:text-hermes-text transition-colors">{label}</span>
    </button>
  )
}
