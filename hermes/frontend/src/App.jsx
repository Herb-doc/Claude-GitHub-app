import React, { useState } from 'react'
import Header from './components/Header'
import BottomNav from './components/BottomNav'
import Dashboard from './components/Dashboard'
import Records from './components/Records'
import Trends from './components/Trends'
import Analyze from './components/Analyze'
import Letters from './components/Letters'
import Protocols from './components/Protocols'
import Consult from './components/Consult'
import hermesData from './data/hermes_data.json'

export default function App() {
  const [activeTab, setActiveTab] = useState('Dashboard')
  const [data, setData] = useState(hermesData)

  const renderTab = () => {
    switch (activeTab) {
      case 'Dashboard': return <Dashboard data={data} onNavigate={setActiveTab} />
      case 'Records': return <Records data={data} />
      case 'Trends': return <Trends data={data} />
      case 'Analyze': return <Analyze data={data} setData={setData} />
      case 'Letters': return <Letters data={data} />
      case 'Protocols': return <Protocols data={data} setData={setData} />
      case 'Consult': return <Consult data={data} />
      case 'Briefing': return <Briefing data={data} />
      default: return <Dashboard data={data} onNavigate={setActiveTab} />
    }
  }

  return (
    <div className="min-h-screen bg-hermes-bg">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-4 pb-24">
        {renderTab()}
      </main>
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  )
}

function Briefing({ data }) {
  const [briefing, setBriefing] = useState(null)
  const [loading, setLoading] = useState(false)

  const generateBriefing = async () => {
    setLoading(true)
    const critical = data.findings.filter(f => ['CRITICAL', 'URGENT', 'HIGH'].includes(f.flag))
    const recent = data.findings.slice(0, 10)
    const protocols = data.protocols.filter(p => p.status === 'active')

    const briefingContent = {
      date: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      physician: data.metadata?.primary_physician || 'Dr. Catherine Dos Santos',
      urgentItems: critical.slice(0, 3).map(f => ({
        finding: f.test_name,
        value: `${f.value} ${f.unit}`,
        date: f.date,
        flag: f.flag
      })),
      recentChanges: recent.slice(0, 5).map(f => ({
        test: f.test_name,
        value: `${f.value} ${f.unit}`,
        date: f.date,
        flag: f.flag
      })),
      suggestedQuestions: [
        'What is the current status of my hepatic cirrhosis and portal hypertension?',
        'Should we investigate the iron-deficient erythropoiesis pattern further?',
        'Are the pancreatic cysts stable and do they need follow-up imaging?',
        'What is the recommended HCC screening interval given my cirrhosis?'
      ],
      activeProtocols: protocols.map(p => `${p.name} — ${p.purpose}`)
    }

    setBriefing(briefingContent)
    setLoading(false)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display text-hermes-gold">Pre-Appointment Briefing</h2>
        <button
          onClick={generateBriefing}
          disabled={loading}
          className="px-5 py-2.5 gradient-gold text-hermes-bg rounded-xl font-ui text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Prepare'}
        </button>
      </div>

      {briefing && (
        <div className="bg-hermes-card border border-hermes-border rounded-2xl p-6 space-y-6 print:bg-white print:text-black">
          <div className="text-center border-b border-hermes-border pb-4">
            <h3 className="text-lg font-display text-hermes-gold">HERMES Pre-Appointment Briefing</h3>
            <p className="text-hermes-muted font-ui text-xs mt-1">{briefing.date}</p>
            <p className="text-hermes-text text-sm mt-1">Prepared for {briefing.physician}</p>
          </div>

          <div>
            <h4 className="font-display text-hermes-critical mb-3">Urgent Items to Discuss</h4>
            <div className="space-y-2">
              {briefing.urgentItems.map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-red-950/30 rounded-xl p-3">
                  <span className="w-6 h-6 rounded-full gradient-red flex items-center justify-center text-white text-xs font-bold">{i + 1}</span>
                  <div className="flex-1">
                    <span className="font-bold text-sm">{item.finding}</span>
                    <span className="text-hermes-muted ml-2 text-sm">{item.value}</span>
                  </div>
                  <span className="text-hermes-muted font-ui text-xs">{item.date}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-display text-hermes-blue mb-3">Recent Lab Changes</h4>
            <div className="space-y-1">
              {briefing.recentChanges.map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm font-ui py-1.5 px-3 rounded-lg hover:bg-hermes-surface/50">
                  <span className="text-hermes-muted w-24">{item.date}</span>
                  <span className="text-hermes-text flex-1">{item.test}: {item.value}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                    item.flag === 'CRITICAL' ? 'bg-red-500/15 text-red-400' :
                    item.flag === 'HIGH' ? 'bg-orange-500/15 text-orange-400' :
                    item.flag === 'LOW' ? 'bg-blue-500/15 text-blue-400' :
                    item.flag === 'WATCH' ? 'bg-yellow-500/15 text-yellow-400' :
                    'bg-green-500/15 text-green-400'
                  }`}>{item.flag}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-display text-hermes-teal mb-3">Suggested Questions</h4>
            <ul className="space-y-2">
              {briefing.suggestedQuestions.map((q, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-hermes-gold mt-0.5">&#9670;</span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-hermes-normal mb-3">Active Protocols</h4>
            <div className="flex flex-wrap gap-2">
              {briefing.activeProtocols.map((p, i) => (
                <span key={i} className="text-xs font-ui text-hermes-muted bg-hermes-surface rounded-full px-3 py-1">
                  {p}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-hermes-border print:hidden">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-hermes-surface border border-hermes-border rounded-xl font-ui text-sm hover:border-hermes-gold transition-colors"
            >
              Print Briefing
            </button>
          </div>
        </div>
      )}

      {!briefing && (
        <div className="bg-hermes-card border border-hermes-border rounded-2xl p-10 text-center">
          <div className="gradient-orange w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">&#128203;</span>
          </div>
          <p className="text-hermes-text text-base">Ready to prepare for your appointment?</p>
          <p className="text-hermes-muted text-sm mt-2">HERMES will compile your urgent items, recent labs, and talking points.</p>
        </div>
      )}
    </div>
  )
}
