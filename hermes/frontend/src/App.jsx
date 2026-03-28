import React, { useState } from 'react'
import Header from './components/Header'
import Dashboard from './components/Dashboard'
import Records from './components/Records'
import Trends from './components/Trends'
import Analyze from './components/Analyze'
import Letters from './components/Letters'
import Protocols from './components/Protocols'
import Consult from './components/Consult'
import hermesData from './data/hermes_data.json'

const TABS = [
  'Dashboard', 'Records', 'Trends', 'Analyze',
  'Letters', 'Protocols', 'Consult', 'Briefing'
]

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
      <Header activeTab={activeTab} setActiveTab={setActiveTab} tabs={TABS} />
      <main className="max-w-7xl mx-auto px-4 py-6">
        {renderTab()}
      </main>
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display text-hermes-gold">Pre-Appointment Briefing</h2>
        <button
          onClick={generateBriefing}
          disabled={loading}
          className="px-6 py-3 bg-hermes-gold text-hermes-bg rounded font-ui text-sm font-bold hover:bg-yellow-500 transition-colors disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Prepare for Appointment'}
        </button>
      </div>

      {briefing && (
        <div className="bg-hermes-card border border-hermes-border rounded-lg p-8 space-y-8 print:bg-white print:text-black">
          <div className="text-center border-b border-hermes-border pb-4">
            <h3 className="text-xl font-display text-hermes-gold">HERMES Pre-Appointment Briefing</h3>
            <p className="text-hermes-muted font-ui text-sm mt-1">{briefing.date}</p>
            <p className="text-hermes-text mt-1">Prepared for appointment with {briefing.physician}</p>
          </div>

          <div>
            <h4 className="text-lg font-display text-hermes-critical mb-3">Top Urgent Items to Discuss</h4>
            <div className="space-y-2">
              {briefing.urgentItems.map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-hermes-surface p-3 rounded">
                  <span className="text-hermes-critical font-ui text-sm font-bold">{i + 1}.</span>
                  <div>
                    <span className="font-bold">{item.finding}</span>
                    <span className="text-hermes-muted ml-2">{item.value}</span>
                    <span className="text-hermes-muted ml-2 font-ui text-xs">({item.date})</span>
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs font-ui ${item.flag === 'CRITICAL' ? 'bg-red-900/50 text-hermes-critical' : 'bg-orange-900/50 text-hermes-high'}`}>
                      {item.flag}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-lg font-display text-hermes-blue mb-3">Recent Lab Changes</h4>
            <div className="space-y-1">
              {briefing.recentChanges.map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm font-ui">
                  <span className="text-hermes-muted w-24">{item.date}</span>
                  <span className="text-hermes-text">{item.test}: {item.value}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    item.flag === 'CRITICAL' ? 'bg-red-900/50 text-hermes-critical' :
                    item.flag === 'HIGH' ? 'bg-orange-900/50 text-hermes-high' :
                    item.flag === 'LOW' ? 'bg-blue-900/50 text-hermes-low' :
                    item.flag === 'WATCH' ? 'bg-yellow-900/50 text-hermes-watch' :
                    'bg-green-900/50 text-hermes-normal'
                  }`}>{item.flag}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-lg font-display text-hermes-teal mb-3">Suggested Questions for the Doctor</h4>
            <ul className="space-y-2">
              {briefing.suggestedQuestions.map((q, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-hermes-gold mt-1">&#9670;</span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-display text-hermes-normal mb-3">Active Protocol Summary</h4>
            <ul className="grid grid-cols-2 gap-1">
              {briefing.activeProtocols.map((p, i) => (
                <li key={i} className="text-sm font-ui text-hermes-muted">&#8226; {p}</li>
              ))}
            </ul>
          </div>

          <div className="flex gap-3 pt-4 border-t border-hermes-border print:hidden">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-hermes-surface border border-hermes-border rounded font-ui text-sm hover:border-hermes-gold transition-colors"
            >
              Print Briefing
            </button>
          </div>
        </div>
      )}

      {!briefing && (
        <div className="bg-hermes-card border border-hermes-border rounded-lg p-12 text-center">
          <p className="text-hermes-muted text-lg">Click "Prepare for Appointment" to generate your pre-appointment briefing.</p>
          <p className="text-hermes-muted mt-2">HERMES will compile your most urgent items, recent lab changes, and suggested discussion points.</p>
        </div>
      )}
    </div>
  )
}
