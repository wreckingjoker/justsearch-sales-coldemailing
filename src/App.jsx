import { useState, useCallback } from 'react'
import CampaignTab from './components/CampaignTab'
import ContactsTab from './components/ContactsTab'
import TemplateTab from './components/TemplateTab'
import RepliesTab from './components/RepliesTab'
import SettingsTab from './components/SettingsTab'

const TABS = [
  {
    id: 'campaign',
    label: 'Campaign',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    id: 'contacts',
    label: 'Contacts',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: 'template',
    label: 'Template',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  },
  {
    id: 'replies',
    label: 'Replies',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('campaign')
  const [toast, setToast] = useState(null)
  const [repliesCount] = useState(0)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }, [])

  const renderTab = () => {
    switch (activeTab) {
      case 'campaign': return <CampaignTab showToast={showToast} />
      case 'contacts': return <ContactsTab showToast={showToast} />
      case 'template': return <TemplateTab showToast={showToast} />
      case 'replies':  return <RepliesTab showToast={showToast} />
      case 'settings': return <SettingsTab showToast={showToast} />
      default: return null
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>

      {/* ── Header ── */}
      <header
        className="flex items-center justify-between px-6 py-3.5 sticky top-0 z-40"
        style={{
          background: 'var(--bg-base)',
          borderBottom: '1px solid var(--border)',
          boxShadow: '0 1px 0 var(--border)',
        }}
      >
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Just Search" className="h-8 object-contain" width="120" height="32" />
          <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
            Email Automation
          </span>
        </div>

        <span
          className="text-xs px-2.5 py-1 rounded-full font-semibold tracking-wide"
          style={{ background: 'var(--accent-muted)', color: 'var(--accent)', letterSpacing: '0.04em' }}
        >
          BETA
        </span>
      </header>

      {/* ── Tab Navigation ── */}
      <nav
        className="flex items-center px-6 sticky z-30"
        style={{
          top: '57px',
          background: 'var(--bg-base)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="font-syne relative flex items-center gap-2 px-4 py-3.5 text-sm font-medium transition-colors duration-150"
              style={{
                color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                letterSpacing: '-0.01em',
              }}
            >
              <span style={{ opacity: isActive ? 1 : 0.65 }}>{tab.icon}</span>
              {tab.label}
              {tab.id === 'replies' && repliesCount > 0 && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                  style={{ background: 'var(--accent)', color: '#fff', fontSize: '10px', lineHeight: 1 }}
                >
                  {repliesCount}
                </span>
              )}
              {isActive && (
                <span
                  className="absolute bottom-0 left-3 right-3 h-0.5 rounded-t"
                  style={{ background: 'var(--accent)' }}
                />
              )}
            </button>
          )
        })}
      </nav>

      {/* ── Content ── */}
      <main className="flex-1 px-6 py-6 max-w-7xl w-full mx-auto">
        {renderTab()}
      </main>

      {/* ── Toast ── */}
      {toast && (
        <div className={`toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toast.type === 'error' ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          )}
          {toast.message}
        </div>
      )}
    </div>
  )
}
