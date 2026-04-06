import { useState } from 'react'
import { saveSettings } from '../api/n8n'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const DEFAULT_SETTINGS = {
  dailyLimit: 50,
  sendTime: '09:00',
  timezone: 'Asia/Dubai',
  replyTo: 'samuel@justsearch.ae',
  cc: 'samuel@justsearch.ae',
  days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  contactSource: 'csv',
  sheetId: '',
}

export default function SettingsTab({ showToast }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [saving, setSaving] = useState(false)

  const set = (key, value) => setSettings((s) => ({ ...s, [key]: value }))

  const toggleDay = (day) =>
    set('days', settings.days.includes(day)
      ? settings.days.filter((d) => d !== day)
      : [...settings.days, day]
    )

  const handleSave = async () => {
    if (settings.dailyLimit < 1 || settings.dailyLimit > 500) {
      showToast('Daily limit must be between 1 and 500', 'error')
      return
    }
    setSaving(true)
    try {
      await saveSettings(settings)
      showToast('Settings saved — takes effect on next scheduled send')
    } catch (err) {
      showToast(`Failed to save: ${err.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">

      {/* ── Header ── */}
      <div>
        <h1>Settings</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Configure sending schedule, limits, and email options
        </p>
      </div>

      {/* ── Sending Limits ── */}
      <div className="card space-y-4">
        <SectionHeader icon={<LimitIcon />} title="Sending Limits" />
        <div>
          <label className="label">Daily Email Limit</label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1} max={500}
              value={settings.dailyLimit}
              onChange={(e) => set('dailyLimit', Math.min(500, Math.max(1, Number(e.target.value))))}
              className="input w-28 tabular-nums"
            />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>max 500 / day</span>
          </div>
        </div>
      </div>

      {/* ── Schedule ── */}
      <div className="card space-y-4">
        <SectionHeader icon={<ClockIcon />} title="Send Schedule" />
        <div>
          <label className="label">Preferred Send Time <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(GST — Asia/Dubai UTC+4)</span></label>
          <input
            type="time"
            value={settings.sendTime}
            onChange={(e) => set('sendTime', e.target.value)}
            className="input w-36 tabular-nums"
          />
        </div>
        <div>
          <label className="label">Send Days</label>
          <div className="flex gap-1.5 flex-wrap">
            {DAYS.map((day) => {
              const active = settings.days.includes(day)
              return (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
                  style={{
                    background: active ? 'var(--accent)' : 'var(--bg-elevated)',
                    color: active ? '#fff' : 'var(--text-muted)',
                    border: active ? 'none' : '1px solid var(--border)',
                  }}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Email Options ── */}
      <div className="card space-y-4">
        <SectionHeader icon={<MailIcon />} title="Email Options" />

        {/* Sender identity (read-only) */}
        <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Sender identity is configured in your n8n Gmail credential. To change the sender email, update the Gmail credential in n8n.
        </div>

        {/* Reply-To */}
        <div>
          <label className="label">Reply-To Address</label>
          <input
            type="email"
            value={settings.replyTo}
            onChange={(e) => set('replyTo', e.target.value)}
            className="input"
            placeholder="sales@justsearch.ae"
          />
        </div>

        {/* CC Recipients */}
        <div>
          <label className="label">
            CC Recipients
            <span className="ml-2 font-normal" style={{ color: 'var(--text-muted)' }}>— added to every outgoing email</span>
          </label>
          <input
            type="text"
            value={settings.cc}
            onChange={(e) => set('cc', e.target.value)}
            className="input"
            placeholder="cc@example.com, manager@justsearch.ae"
          />
          <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
            Comma-separated. Leave blank to send with no CC.
          </p>
        </div>
      </div>

      {/* ── Contact Source ── */}
      <div className="card space-y-4">
        <SectionHeader icon={<DatabaseIcon />} title="Contact Source" />
        <div className="flex gap-2">
          {[{ id: 'csv', label: '📄 CSV Upload' }, { id: 'sheets', label: '📊 Google Sheets' }].map((src) => {
            const active = settings.contactSource === src.id
            return (
              <button
                key={src.id}
                onClick={() => set('contactSource', src.id)}
                className="flex-1 py-3 rounded-lg text-sm font-medium transition-all duration-150"
                style={{
                  background: active ? 'var(--accent-muted)' : 'var(--bg-base)',
                  borderColor: active ? 'var(--accent)' : 'var(--border)',
                  border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                  color: active ? 'var(--accent)' : 'var(--text-muted)',
                }}
              >
                {src.label}
              </button>
            )
          })}
        </div>
        {settings.contactSource === 'sheets' && (
          <div>
            <label className="label">Google Sheet ID</label>
            <input
              type="text"
              value={settings.sheetId}
              onChange={(e) => set('sheetId', e.target.value)}
              className="input font-mono"
              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
              style={{ fontSize: '12px' }}
            />
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
              Found in the Google Sheets URL. Share the sheet with the n8n service account.
            </p>
          </div>
        )}
      </div>

      {/* ── Save ── */}
      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-55">
          {saving
            ? <><SpinnerIcon /> Saving…</>
            : <><SaveIcon /> Save Settings</>
          }
        </button>
        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
          ⚠ Changes apply from the next scheduled send
        </p>
      </div>
    </div>
  )
}

const SectionHeader = ({ icon, title }) => (
  <div className="flex items-center gap-2.5 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
    <span style={{ color: 'var(--accent)' }}>{icon}</span>
    <h3 style={{ margin: 0 }}>{title}</h3>
  </div>
)

const LimitIcon   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
const ClockIcon   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
const MailIcon    = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
const DatabaseIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>
const SpinnerIcon  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
const SaveIcon     = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
