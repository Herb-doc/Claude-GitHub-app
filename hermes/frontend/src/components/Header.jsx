import React from 'react'
import Caduceus from './Caduceus'

export default function Header() {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <header className="bg-hermes-surface/80 backdrop-blur-md border-b border-hermes-border/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-xl bg-hermes-gold/10 border border-hermes-gold/20">
              <Caduceus size={28} />
            </div>
            <div>
              <h1 className="text-hermes-gold font-display text-base tracking-[0.2em] font-bold leading-tight">
                HERMES
              </h1>
              <p className="text-hermes-muted font-ui text-[9px] tracking-wider">
                MEDICAL INTELLIGENCE
              </p>
            </div>
          </div>
          <p className="text-hermes-muted font-ui text-xs">
            {greeting}, <span className="text-hermes-gold">Daniel</span>
          </p>
        </div>
      </div>
    </header>
  )
}
