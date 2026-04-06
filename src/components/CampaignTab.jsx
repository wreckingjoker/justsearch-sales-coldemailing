import { useState, useCallback } from 'react'
import { usePolling } from '../hooks/usePolling'
import { getStats, startCampaign, pauseCampaign, sendNow, stopSending } from '../api/n8n'

const INITIAL_STATS = { total: 0, sent: 0, pending: 0, failed: 0, opened: 0, replied: 0 }
const INTERVALS = [
  { label: '30 sec', value: 0.5 },
  { label: '1 min',  value: 1 },
  { label: '2 min',  value: 2 },
  { label: '5 min',  value: 5 },
]

const StatCard = ({ label, value, color, bg, icon }) => (
  <div className="card flex items-start gap-3.5">
    <div
      className="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0"
      style={{ background: bg }}
    >
      <span style={{ color }}>{icon}</span>
    </div>
    <div>
      <p
        className="font-syne tabular-nums"
        style={{ fontSize: '1.375rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-primary)', lineHeight: 1.1 }}
      >
        {value}
      </p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
    </div>
  </div>
)

const ProgressRing = ({ sent, total }) => {
  const size = 120
  const strokeWidth = 9
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const percent = total > 0 ? Math.min((sent / total) * 100, 100) : 0
  const offset = circumference - (percent / 100) * circumference

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--bg-elevated)" strokeWidth={strokeWidth} />
        <circle
          className="progress-ring__circle"
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--accent)" strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-syne tabular-nums" style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
          {Math.round(percent)}%
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.02em' }}>sent</span>
      </div>
    </div>
  )
}

export default function CampaignTab({ showToast }) {
  const [stats, setStats] = useState(INITIAL_STATS)
  const [campaignActive, setCampaignActive] = useState(false)
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sendNowLoading, setSendNowLoading] = useState(false)
  const [interval, setInterval] = useState(1)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchStats = useCallback(async () => {
    try {
      const data = await getStats()
      setStats(data)
      if (typeof data.campaignActive === 'boolean') {
        setCampaignActive(data.campaignActive)
      }
      setLastUpdated(new Date())
    } catch { /* silent */ }
  }, [])

  usePolling(fetchStats, 30000)

  const handleToggleCampaign = async () => {
    setLoading(true)
    try {
      if (campaignActive) {
        await pauseCampaign()
        setCampaignActive(false)
        showToast('Campaign paused')
      } else {
        await startCampaign()
        setCampaignActive(true)
        showToast('Campaign started — emails will send on schedule')
      }
    } catch (err) {
      showToast(`Failed to ${campaignActive ? 'pause' : 'start'}: ${err.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSendNow = async () => {
    if (stats.pending === 0) {
      showToast('No pending contacts to send to', 'error')
      return
    }
    setSendNowLoading(true)
    setSending(true)
    try {
      await sendNow(interval)
      showToast(`Sending started — ${stats.pending} email${stats.pending > 1 ? 's' : ''} queued`)
      // Refresh stats after a short delay
      setTimeout(fetchStats, 5000)
    } catch (err) {
      showToast(`Send failed: ${err.message}`, 'error')
      setSending(false)
    } finally {
      setSendNowLoading(false)
    }
  }

  const handleStop = async () => {
    try {
      await stopSending()
      setSending(false)
      showToast('Sending stopped')
    } catch (err) {
      // Even if stop fails, reset UI state
      setSending(false)
      showToast('Stopped', 'error')
    }
  }

  const formatTime = (date) =>
    date
      ? date.toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dubai' })
      : '—'

  const statCards = [
    { label: 'Total Contacts', value: stats.total,   color: 'var(--text-primary)', bg: 'var(--bg-elevated)', icon: <ContactIcon /> },
    { label: 'Sent',           value: stats.sent,    color: 'var(--info)',          bg: 'var(--info-muted)',    icon: <SentIcon /> },
    { label: 'Pending',        value: stats.pending, color: 'var(--warning)',       bg: 'var(--warning-muted)', icon: <PendingIcon /> },
    { label: 'Failed',         value: stats.failed,  color: 'var(--error)',         bg: 'var(--error-muted)',   icon: <FailedIcon /> },
    { label: 'Opened',         value: stats.opened,  color: 'var(--success)',       bg: 'var(--success-muted)', icon: <OpenedIcon /> },
    { label: 'Replied',        value: stats.replied, color: 'var(--accent)',        bg: 'var(--accent-muted)',  icon: <RepliedIcon /> },
  ]

  return (
    <div className="space-y-6">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1>Campaign Overview</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Monitor and control your cold email campaign
          </p>
        </div>

        <div className="flex items-center gap-3">
          {(campaignActive || sending) && (
            <div className="flex items-center gap-2">
              <div className="pulse-dot" />
              <span className="text-sm font-medium" style={{ color: 'var(--success)' }}>
                {sending ? 'Sending…' : 'Live'}
              </span>
            </div>
          )}
          <button
            onClick={handleToggleCampaign}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 disabled:opacity-55"
            style={{
              background: campaignActive ? 'var(--bg-base)' : 'var(--accent-gradient)',
              color: campaignActive ? 'var(--text-primary)' : '#fff',
              border: campaignActive ? '1px solid var(--border)' : 'none',
              boxShadow: campaignActive ? 'none' : '0 2px 8px rgba(255,87,51,0.28)',
              letterSpacing: '0.01em',
            }}
          >
            {loading ? <SpinnerIcon /> : campaignActive ? <PauseIcon /> : <PlayIcon />}
            {loading ? 'Processing…' : campaignActive ? 'Pause Campaign' : 'Start Campaign'}
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((card) => <StatCard key={card.label} {...card} />)}
      </div>

      {/* ── Send Now panel ── */}
      <div className="card" style={{ border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 style={{ margin: 0 }}>Send Now</h3>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Immediately send to all pending contacts, bypassing the schedule
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Interval picker */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                Interval:
              </span>
              <div
                className="flex rounded-lg overflow-hidden"
                style={{ border: '1px solid var(--border)' }}
              >
                {INTERVALS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setInterval(opt.value)}
                    className="px-2.5 py-1.5 text-xs font-medium transition-colors"
                    style={{
                      background: interval === opt.value ? 'var(--accent)' : 'var(--bg-base)',
                      color: interval === opt.value ? '#fff' : 'var(--text-muted)',
                      borderRight: '1px solid var(--border)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Stop button — only when sending */}
            {sending && (
              <button
                onClick={handleStop}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: 'var(--error-muted)',
                  color: 'var(--error)',
                  border: '1px solid var(--error)',
                }}
              >
                <StopIcon /> Stop
              </button>
            )}

            {/* Send Now button */}
            <button
              onClick={handleSendNow}
              disabled={sendNowLoading || stats.pending === 0}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-55"
              style={{
                background: sending ? 'var(--bg-elevated)' : 'var(--accent)',
                color: sending ? 'var(--text-muted)' : '#fff',
                boxShadow: sending ? 'none' : '0 2px 8px rgba(255,87,51,0.28)',
              }}
            >
              {sendNowLoading ? <SpinnerIcon /> : <BoltIcon />}
              {sendNowLoading ? 'Starting…' : sending ? 'Sending…' : `Send Now (${stats.pending} pending)`}
            </button>
          </div>
        </div>

        {/* Sending progress bar */}
        {sending && stats.total > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Sending in progress — {stats.sent} of {stats.total} sent
              </span>
              <span className="text-xs font-medium tabular-nums" style={{ color: 'var(--accent)' }}>
                {Math.round(stats.total > 0 ? (stats.sent / stats.total) * 100 : 0)}%
              </span>
            </div>
            <div className="w-full rounded-full" style={{ height: '4px', background: 'var(--bg-elevated)' }}>
              <div
                className="rounded-full transition-all duration-700"
                style={{
                  height: '4px',
                  width: `${stats.total > 0 ? (stats.sent / stats.total) * 100 : 0}%`,
                  background: 'var(--accent)',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Progress + schedule ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card flex flex-col items-center justify-center gap-3 py-6">
          <ProgressRing sent={stats.sent} total={stats.total} />
          <div className="text-center">
            <p className="font-syne text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {stats.sent} of {stats.total} sent
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>campaign progress</p>
          </div>
        </div>

        <div className="card space-y-3 col-span-2">
          <h3>Schedule Info</h3>
          <div className="space-y-0">
            <InfoRow label="Status" value={
              <span
                className="badge"
                style={campaignActive
                  ? { background: 'var(--success-muted)', color: 'var(--success)' }
                  : { background: 'var(--bg-elevated)', color: 'var(--text-muted)' }
                }
              >
                {campaignActive ? '● Active' : '○ Paused'}
              </span>
            } />
            <InfoRow label="Send Schedule"  value="09:00 AM GST (Mon–Fri)" />
            <InfoRow label="Interval"       value={INTERVALS.find(i => i.value === interval)?.label + ' between emails'} />
            <InfoRow label="Timezone"       value="Asia/Dubai (UTC+4)" />
            <InfoRow label="Stats Updated"  value={lastUpdated ? `${formatTime(lastUpdated)} today` : 'Not yet polled'} />
          </div>

          {!campaignActive && stats.total === 0 && (
            <div
              className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs"
              style={{ background: 'var(--warning-muted)', color: 'var(--warning)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Upload contacts and save a template before starting.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const InfoRow = ({ label, value }) => (
  <div
    className="flex items-center justify-between py-2"
    style={{ borderBottom: '1px solid var(--border)' }}
  >
    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</span>
    <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>{value}</span>
  </div>
)

const ContactIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
const SentIcon    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
const PendingIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
const FailedIcon  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
const OpenedIcon  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
const RepliedIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></svg>
const PlayIcon    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
const PauseIcon   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
const SpinnerIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
const BoltIcon    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
const StopIcon    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>
