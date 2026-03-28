import React from 'react'
import Caduceus from './Caduceus'

export default function Header({ activeTab, setActiveTab, tabs }) {
  return (
    <header className="bg-hermes-surface border-b border-hermes-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Caduceus size={36} />
            <div>
              <h1 className="text-hermes-gold font-display text-lg tracking-[0.25em] font-bold">
                HERMES
              </h1>
              <p className="text-hermes-muted font-ui text-[10px] tracking-wider -mt-1">
                PERSONAL MEDICAL INTELLIGENCE
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-2 font-ui text-xs tracking-wide rounded transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-hermes-gold/20 text-hermes-gold border border-hermes-gold/30'
                    : 'text-hermes-muted hover:text-hermes-text hover:bg-hermes-card'
                }`}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </header>
  )
}
