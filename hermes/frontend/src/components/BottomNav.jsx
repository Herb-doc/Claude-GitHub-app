import React, { useState, useEffect } from 'react'
import {
  LayoutDashboard, Users, ClipboardList, TrendingUp, MessageCircle,
  FlaskConical, Mail, Leaf, FileText, Inbox, ShieldCheck, Globe,
  MoreHorizontal, X,
} from 'lucide-react'

// The five that earn a permanent slot; everything else lives behind "More".
export const PRIMARY = [
  { key: 'Dashboard', label: 'Home', icon: LayoutDashboard, color: '#D4A843' },
  { key: 'Patients', label: 'Patients', icon: Users, color: '#4A8FD4' },
  { key: 'Records', label: 'Records', icon: ClipboardList, color: '#3ABFBF' },
  { key: 'Trends', label: 'Trends', icon: TrendingUp, color: '#9B7BFF' },
  { key: 'Consult', label: 'Consult', icon: MessageCircle, color: '#E8C66A' },
]

export const MORE = [
  { key: 'Analyze', label: 'Analyze Labs', desc: 'Parse new results', icon: FlaskConical, color: '#9B7BFF' },
  { key: 'Letters', label: 'Letters', desc: 'Write to a doctor', icon: Mail, color: '#E06B9F' },
  { key: 'Protocols', label: 'Herbs', desc: 'Your protocols', icon: Leaf, color: '#52C47A' },
  { key: 'Briefing', label: 'Briefing', desc: 'Prep for appointments', icon: FileText, color: '#E08030' },
  { key: 'Workspace', label: 'Workspace', desc: 'Mail, Drive, Calendar', icon: Inbox, color: '#3ABFBF' },
  { key: 'Website', label: 'Practice', desc: 'Site and content', icon: Globe, color: '#D4A843' },
  { key: 'Guardian', label: 'Guardian', desc: 'System health', icon: ShieldCheck, color: '#52C47A' },
]

export const ALL_TABS = [...PRIMARY.map(t => t.key), ...MORE.map(t => t.key)]

export default function BottomNav({ activeTab, setActiveTab }) {
  const [sheetOpen, setSheetOpen] = useState(false)

  // Close the sheet on Escape, and lock scroll behind it.
  useEffect(() => {
    if (!sheetOpen) return
    const onKey = (e) => { if (e.key === 'Escape') setSheetOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sheetOpen])

  const inMore = MORE.some(m => m.key === activeTab)
  const activeMore = MORE.find(m => m.key === activeTab)

  const pick = (key) => {
    setActiveTab(key)
    setSheetOpen(false)
  }

  return (
    <>
      {/* More sheet */}
      {sheetOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setSheetOpen(false)}
          />
          <div className="fixed bottom-[68px] left-0 right-0 z-50 px-3 animate-slide-up">
            <div className="max-w-3xl mx-auto bg-hermes-surface border border-hermes-border rounded-2xl p-3 shadow-2xl">
              <div className="flex items-center justify-between px-2 pb-2">
                <p className="font-ui text-[10px] text-hermes-muted tracking-wider">MORE TOOLS</p>
                <button
                  onClick={() => setSheetOpen(false)}
                  className="text-hermes-muted hover:text-hermes-gold transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {MORE.map(item => {
                  const Icon = item.icon
                  const active = activeTab === item.key
                  return (
                    <button
                      key={item.key}
                      onClick={() => pick(item.key)}
                      className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                        active
                          ? 'bg-hermes-card border border-hermes-gold/40'
                          : 'bg-hermes-card/50 border border-hermes-border hover:border-hermes-gold/30'
                      }`}
                    >
                      <Icon size={20} color={item.color} className="shrink-0" />
                      <div className="min-w-0">
                        <p className="text-hermes-text text-sm font-medium truncate">{item.label}</p>
                        <p className="text-hermes-muted text-[10px] truncate">{item.desc}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-hermes-surface/95 backdrop-blur-md border-t border-hermes-border">
        <div className="max-w-3xl mx-auto flex items-center justify-around px-2 py-1">
          {PRIMARY.map(item => {
            const isActive = activeTab === item.key
            const Icon = item.icon
            return (
              <NavButton
                key={item.key}
                icon={Icon}
                label={item.label}
                color={item.color}
                active={isActive}
                onClick={() => { setActiveTab(item.key); setSheetOpen(false) }}
              />
            )
          })}

          <NavButton
            icon={activeMore?.icon || MoreHorizontal}
            label={activeMore?.label || 'More'}
            color={activeMore?.color || '#D4A843'}
            active={inMore || sheetOpen}
            onClick={() => setSheetOpen(o => !o)}
          />
        </div>
      </nav>
    </>
  )
}

function NavButton({ icon: Icon, label, color, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition-all duration-200 min-w-[56px] ${
        active ? 'nav-active scale-105' : 'hover:bg-hermes-card/50 active:scale-95'
      }`}
    >
      <Icon
        size={22}
        strokeWidth={active ? 2.5 : 1.5}
        color={active ? color : '#6B82A0'}
        className="transition-all duration-200"
      />
      <span
        className="font-ui text-[10px] tracking-wide transition-colors duration-200 truncate max-w-[64px]"
        style={{ color: active ? color : '#6B82A0' }}
      >
        {label}
      </span>
      {active && (
        <div className="w-1 h-1 rounded-full mt-0.5" style={{ backgroundColor: color }} />
      )}
    </button>
  )
}
