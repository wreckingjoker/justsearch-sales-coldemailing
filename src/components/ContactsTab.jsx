import { useState, useCallback, useRef } from 'react'
import { parseCSV } from '../utils/csvParser'
import { uploadContacts, getContacts } from '../api/n8n'
import { usePolling } from '../hooks/usePolling'

const STATUS_FILTERS = ['all', 'pending', 'sent', 'failed', 'opened', 'replied']

const StatusBadge = ({ status }) => (
  <span className={`badge badge-${status}`}>
    {status.charAt(0).toUpperCase() + status.slice(1)}
  </span>
)

export default function ContactsTab({ showToast }) {
  const [contacts, setContacts] = useState([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef(null)

  const fetchContacts = useCallback(async () => {
    try {
      const data = await getContacts()
      if (Array.isArray(data)) setContacts(data)
    } catch { /* silent */ }
  }, [])

  usePolling(fetchContacts, 30000)

  const handleFile = (file) => {
    if (!file || !file.name.endsWith('.csv')) {
      showToast('Please upload a .csv file', 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = parseCSV(e.target.result)
      if (result.error) { showToast(result.error, 'error'); return }
      setPreview(result)
    }
    reader.readAsText(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleConfirmUpload = async () => {
    if (!preview?.valid?.length) return
    setUploading(true)
    try {
      await uploadContacts(preview.valid)
      setContacts((prev) => [...prev, ...preview.valid])
      showToast(`${preview.valid.length} contacts uploaded`)
      setPreview(null)
    } catch (err) {
      showToast(`Upload failed: ${err.message}`, 'error')
    } finally {
      setUploading(false)
    }
  }

  const filtered = contacts
    .filter((c) => filter === 'all' || c.status === filter)
    .filter((c) => {
      if (!search) return true
      const q = search.toLowerCase()
      return c.name?.toLowerCase().includes(q) || c.company?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
    })

  const counts = STATUS_FILTERS.reduce((acc, f) => {
    acc[f] = f === 'all' ? contacts.length : contacts.filter((c) => c.status === f).length
    return acc
  }, {})

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Contacts</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {contacts.length} total contacts loaded
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setLoading(true); fetchContacts().finally(() => setLoading(false)) }}
            className="btn-secondary text-xs px-3 py-2"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={loading ? 'animate-spin' : ''}>
              <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Refresh
          </button>
          <button onClick={() => fileRef.current?.click()} className="btn-primary text-xs px-4 py-2">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Upload CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
        </div>
      </div>

      {/* ── Preview modal ── */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.25)' }}>
          <div className="card w-full max-w-md mx-4" style={{ boxShadow: 'var(--shadow-lg)' }}>
            <h2 className="mb-4">CSV Preview</h2>
            <div className="flex gap-3 mb-4">
              <Pill count={preview.valid.length} label="valid" color="var(--success)" bg="var(--success-muted)" />
              <Pill count={preview.rejected.length} label="rejected" color="var(--error)" bg="var(--error-muted)" />
            </div>
            {preview.rejected.length > 0 && (
              <div className="mb-4 space-y-1 max-h-32 overflow-y-auto">
                {preview.rejected.map((r) => (
                  <div key={r.row} className="flex items-center justify-between rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--error-muted)', color: 'var(--error)' }}>
                    <span>Row {r.row}: {r.data.name || r.data.email || '(empty)'}</span>
                    <span className="font-medium">{r.reason}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setPreview(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button
                onClick={handleConfirmUpload}
                disabled={uploading || preview.valid.length === 0}
                className="btn-primary flex-1 justify-center disabled:opacity-55"
              >
                {uploading ? 'Uploading…' : `Upload ${preview.valid.length} contacts`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Empty drop zone ── */}
      {contacts.length === 0 && !preview && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center justify-center rounded-xl py-16 cursor-pointer transition-all duration-150"
          style={{
            border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border-strong)'}`,
            background: dragOver ? 'var(--accent-muted)' : 'var(--bg-surface)',
          }}
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: 'var(--accent-muted)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p className="font-syne text-sm font-semibold">Drop your CSV here or click to browse</p>
          <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
            Required: <strong>name</strong>, <strong>email</strong> &nbsp;·&nbsp; Optional: company, industry, website
          </p>
        </div>
      )}

      {/* ── Filters + table ── */}
      {contacts.length > 0 && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all duration-150"
                  style={{
                    background: filter === f ? 'var(--accent)' : 'var(--bg-elevated)',
                    color: filter === f ? '#fff' : 'var(--text-muted)',
                    border: filter === f ? 'none' : '1px solid var(--border)',
                  }}
                >
                  {f} ({counts[f]})
                </button>
              ))}
            </div>
            <div className="flex-1 min-w-[200px] relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search name, company or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-9"
              />
            </div>
            <button onClick={() => fileRef.current?.click()} className="btn-secondary text-xs px-3 py-2">+ Add more</button>
          </div>

          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
                    {['Name', 'Company', 'Email', 'Industry', 'Status', 'Sent At'].map((h) => (
                      <th key={h} className="table-header-cell text-left px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-sm" style={{ color: 'var(--text-muted)' }}>
                        No contacts match your filter
                      </td>
                    </tr>
                  ) : (
                    filtered.map((c) => (
                      <tr
                        key={c.id || c.email}
                        className="transition-colors hover:bg-gray-50"
                        style={{ borderBottom: '1px solid var(--border)' }}
                      >
                        <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{c.name}</td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{c.company || '—'}</td>
                        <td className="px-4 py-3" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{c.email}</td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{c.industry || '—'}</td>
                        <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                        <td className="px-4 py-3" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                          {c.sent_at ? new Date(c.sent_at).toLocaleDateString('en-AE') : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const Pill = ({ count, label, color, bg }) => (
  <div className="flex-1 rounded-lg p-3 text-center" style={{ background: bg }}>
    <p className="font-syne tabular-nums text-xl font-bold" style={{ color, lineHeight: 1.1 }}>{count}</p>
    <p className="text-xs mt-1" style={{ color }}>{label}</p>
  </div>
)
