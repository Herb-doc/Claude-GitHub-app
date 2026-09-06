import React from 'react'
import {
  LayoutDashboard,
  ClipboardList,
  TrendingUp,
  FlaskConical,
  Mail,
  Leaf,
  MessageCircle,
  FileText,
} from 'lucide-react'

const NAV_ITEMS = [
  { key: 'Dashboard', label: 'Home', icon: LayoutDashboard, color: '#D4A843' },
  { key: 'Records', label: 'Records', icon: ClipboardList, color: '#4A8FD4' },
  { key: 'Trends', label: 'Trends', icon: TrendingUp, color: '#3ABFBF' },
  { key: 'Analyze', label: 'Analyze', icon: FlaskConical, color: '#9B7BFF' },
  { key: 'Letters', label: 'Letters', icon: Mail, color: '#E06B9F' },
  { key: 'Protocols', label: 'Herbs', icon: Leaf, color: '#52C47A' },
  { key: 'Consult', label: 'Consult', icon: MessageCircle, color: '#E8C66A' },
  { key: 'Briefing', label: 'Briefing', icon: FileText, color: '#E08030' },
]

export default function BottomNav({ activeTab, setActiveTab }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-hermes-surface/95 backdrop-blur-md border-t border-hermes-border">
      <div className="max-w-3xl mx-auto flex items-center justify-around px-2 py-1">
        {NAV_ITEMS.map(item => {
          const isActive = activeTab === item.key
          const Icon = item.icon
          return (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition-all duration-200 min-w-[52px] ${
                isActive
                  ? 'nav-active scale-105'
                  : 'hover:bg-hermes-card/50 active:scale-95'
              }`}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 1.5}
                color={isActive ? item.color : '#6B82A0'}
                className="transition-all duration-200"
              />
              <span
                className="font-ui text-[10px] tracking-wide transition-colors duration-200"
                style={{ color: isActive ? item.color : '#6B82A0' }}
              >
                {item.label}
              </span>
              {isActive && (
                <div
                  className="w-1 h-1 rounded-full mt-0.5"
                  style={{ backgroundColor: item.color }}
                />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
