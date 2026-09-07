import React from 'react'
import {
  AlertTriangle,
  Activity,
  Shield,
  Leaf,
  TrendingUp,
  MessageCircle,
  FlaskConical,
  Mail,
  Users,
  Inbox,
  ChevronRight,
} from 'lucide-react'

const FLAG_COLORS = {
  CRITICAL: { bg: 'bg-red-500/15', text: 'text-red-400', dot: 'bg-red-400' },
  URGENT: { bg: 'bg-red-500/15', text: 'text-red-400', dot: 'bg-red-400' },
  HIGH: { bg: 'bg-orange-500/15', text: 'text-orange-400', dot: 'bg-orange-400' },
  LOW: { bg: 'bg-blue-500/15', text: 'text-blue-400', dot: 'bg-blue-400' },
  WATCH: { bg: 'bg-yellow-500/15', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  NORMAL: { bg: 'bg-green-500/15', text: 'text-green-400', dot: 'bg-green-400' },
}

export default function Dashboard({ data, onNavigate }) {
  const findings = data.findings || []
  const protocols = data.protocols || []

  const criticalFlags = findings.filter(f => ['CRITICAL', 'URGENT'].includes(f.flag))
  const activeIssues = findings.filter(f => f.status === 'active')
  const activeProtocols = protocols.filter(p => p.status === 'active')
  const recentFindings = findings.slice(0, 6)

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Critical Alert Banner */}
      {criticalFlags.length > 0 && (
        <div className="gradient-red rounded-2xl p-4 pulse-alert">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-red-300" />
            <span className="text-red-200 font-ui text-xs font-bold tracking-wider">
              {criticalFlags.length} CRITICAL {criticalFlags.length === 1 ? 'FLAG' : 'FLAGS'}
            </span>
          </div>
          <div className="space-y-1.5">
            {criticalFlags.slice(0, 3).map((f, i) => (
              <div key={i} className="flex items-center gap-3 bg-black/20 rounded-lg px-3 py-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                <span className="text-white text-sm font-medium">{f.test_name}</span>
                <span className="text-red-200 font-ui text-xs ml-auto">{f.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Findings"
          value={findings.length}
          icon={Activity}
          gradient="gradient-blue"
          iconColor="#6DB3F8"
        />
        <StatCard
          label="Active Issues"
          value={activeIssues.length}
          icon={AlertTriangle}
          gradient="gradient-orange"
          iconColor="#F0A050"
        />
        <StatCard
          label="Critical"
          value={criticalFlags.length}
          icon={Shield}
          gradient="gradient-red"
          iconColor="#FF6666"
        />
        <StatCard
          label="Protocols"
          value={activeProtocols.length}
          icon={Leaf}
          gradient="gradient-green"
          iconColor="#72E49A"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <QuickAction
          label="Find a Patient"
          desc="Search your Drive"
          icon={Users}
          color="#4A8FD4"
          bgClass="bg-hermes-blue/10 border-hermes-blue/20"
          onClick={() => onNavigate('Patients')}
        />
        <QuickAction
          label="Consult HERMES"
          desc="Chat with your AI advisor"
          icon={MessageCircle}
          color="#E8C66A"
          bgClass="bg-hermes-gold/10 border-hermes-gold/20"
          onClick={() => onNavigate('Consult')}
        />
        <QuickAction
          label="View Trends"
          desc="Track your markers"
          icon={TrendingUp}
          color="#3ABFBF"
          bgClass="bg-hermes-teal/10 border-hermes-teal/20"
          onClick={() => onNavigate('Trends')}
        />
        <QuickAction
          label="Upload Labs"
          desc="Analyze new results"
          icon={FlaskConical}
          color="#9B7BFF"
          bgClass="bg-hermes-purple/10 border-hermes-purple/20"
          onClick={() => onNavigate('Analyze')}
        />
        <QuickAction
          label="Write Letter"
          desc="Generate for doctor"
          icon={Mail}
          color="#E06B9F"
          bgClass="bg-hermes-pink/10 border-hermes-pink/20"
          onClick={() => onNavigate('Letters')}
        />
        <QuickAction
          label="Workspace"
          desc="Mail, Drive, Calendar"
          icon={Inbox}
          color="#52C47A"
          bgClass="bg-green-500/10 border-green-500/20"
          onClick={() => onNavigate('Workspace')}
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-hermes-card border border-hermes-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-hermes-gold font-display text-base">Recent Activity</h3>
          <button
            onClick={() => onNavigate('Records')}
            className="flex items-center gap-1 text-hermes-muted font-ui text-xs hover:text-hermes-gold transition-colors"
          >
            View all <ChevronRight size={14} />
          </button>
        </div>
        <div className="space-y-1">
          {recentFindings.map((f, i) => {
            const flagStyle = FLAG_COLORS[f.flag] || FLAG_COLORS.NORMAL
            return (
              <div
                key={i}
                className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-hermes-surface/50 transition-colors"
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${flagStyle.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-hermes-text text-sm truncate">{f.test_name}</p>
                  <p className="text-hermes-muted font-ui text-[10px]">{f.date}</p>
                </div>
                <span className="text-hermes-muted font-ui text-xs whitespace-nowrap">
                  {typeof f.value === 'string' && f.value.length > 15
                    ? f.value.slice(0, 15) + '...'
                    : `${f.value} ${f.unit}`}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-ui font-medium ${flagStyle.bg} ${flagStyle.text}`}>
                  {f.flag}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Active Protocols Preview */}
      <div className="bg-hermes-card border border-hermes-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-hermes-gold font-display text-base">Active Protocols</h3>
          <button
            onClick={() => onNavigate('Protocols')}
            className="flex items-center gap-1 text-hermes-muted font-ui text-xs hover:text-hermes-gold transition-colors"
          >
            Manage <ChevronRight size={14} />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeProtocols.map((p, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-green-900/20 border border-green-800/30 rounded-full px-3 py-1.5"
            >
              <Leaf size={12} className="text-green-400" />
              <span className="text-green-300 text-xs font-medium">{p.name.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center pb-2">
        <p className="text-hermes-muted font-ui text-[10px]">
          {data.metadata?.patient_name} &middot; {data.metadata?.primary_physician} &middot; Last sync {data.metadata?.last_sync?.split('T')[0] || 'Never'}
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

function QuickAction({ label, desc, icon: Icon, color, bgClass, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`${bgClass} border rounded-2xl p-4 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] card-glow group`}
    >
      <Icon size={24} color={color} className="mb-2" />
      <p className="text-hermes-text text-sm font-medium">{label}</p>
      <p className="text-hermes-muted text-xs mt-0.5">{desc}</p>
    </button>
  )
}
