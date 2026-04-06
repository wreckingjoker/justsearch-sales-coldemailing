import { useState, useCallback } from 'react'
import { usePolling } from '../hooks/usePolling'
import { getReplies, markAsLead, archiveReply } from '../api/n8n'

const REPLY_FILTERS = ['all', 'leads', 'archived']

export default function RepliesTab({ showToast }) {
  const [replies, setReplies] = useState([])
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)
  const [loading, setLoading] = useState({})

  const fetchReplies = useCallback(async () => {
    try {
      const data = await getReplies()
      if (Array.isArray(data)) setReplies(data)
    } catch { /* silent */ }
  }, [])

  usePolling(fetchReplies, 60000)

  const handleMarkLead = async (contactId) => {
    setLoading((l) => ({ ...l, [contactId]: 'lead' }))
    try {
      await markAsLead(contactId)
      setReplies((r) => r.map((x) => x.id === contactId ? { ...x, is_lead: true } : x))
      showToast('Marked as lead')
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error')
    } finally {
      setLoading((l) => ({ ...l, [contactId]: null }))
    }
  }

  const handleArchive = async (contactId) => {
    setLoading((l) => ({ ...l, [contactId]: 'archive' }))
    try {
      await archiveReply(contactId)
      setReplies((r) => r.map((x) => x.id === contactId ? { ...x, archived: true } : x))
      showToast('Reply archived')
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error')
    } finally {
      setLoading((l) => ({ ...l, [contactId]: null }))
    }
  }

  const filtered = replies.filter((r) => {
    if (filter === 'leads')    return r.is_lead && !r.archived
    if (filter === 'archived') return r.archived
    return !r.archived
  })

  const counts = {
    all:      replies.filter((r) => !r.archived).length,
    leads:    replies.filter((r) => r.is_lead && !r.archived).length,
    archived: replies.filter((r) => r.archived).length,
  }

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div>
        <h1>Replies</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          {counts.all} {counts.all === 1 ? 'reply' : 'replies'} received
          {counts.leads > 0 && ` · ${counts.leads} lead${counts.leads > 1 ? 's' : ''} identified`}
        </p>
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex items-center gap-1">
        {REPLY_FILTERS.map((f) => (
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

      {/* ── Empty state ── */}
      {filtered.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-xl"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: 'var(--bg-elevated)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <p className="font-syne text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
            {filter === 'archived' ? 'No archived replies' : filter === 'leads' ? 'No leads yet' : 'No replies yet'}
          </p>
          {filter === 'all' && (
            <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
              Check back after your campaign runs
            </p>
          )}
        </div>
      )}

      {/* ── Replies list ── */}
      {filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((reply) => {
            const isExpanded = expanded === reply.id
            const busy = loading[reply.id]
            const preview = reply.reply_preview || reply.reply_text || ''

            return (
              <div
                key={reply.id}
                className="card"
                style={{ borderLeft: reply.is_lead ? '3px solid var(--success)' : '3px solid transparent' }}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Avatar + info */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className="font-syne w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                      style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}
                    >
                      {(reply.name || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-syne text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {reply.name}
                        </span>
                        {reply.company && (
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>· {reply.company}</span>
                        )}
                        {reply.is_lead && (
                          <span className="badge" style={{ background: 'var(--success-muted)', color: 'var(--success)', fontSize: '10px' }}>
                            🏆 Lead
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{reply.email}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                        {reply.reply_time
                          ? new Date(reply.reply_time).toLocaleString('en-AE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                          : 'Just now'}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {!reply.is_lead && (
                      <ActionBtn
                        onClick={() => handleMarkLead(reply.id)}
                        disabled={!!busy}
                        bg="var(--success-muted)"
                        color="var(--success)"
                      >
                        {busy === 'lead' ? '…' : '🏆 Lead'}
                      </ActionBtn>
                    )}
                    <a
                      href={`mailto:${reply.email}`}
                      className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}
                    >
                      Reply
                    </a>
                    {!reply.archived && (
                      <ActionBtn
                        onClick={() => handleArchive(reply.id)}
                        disabled={!!busy}
                        bg="var(--bg-elevated)"
                        color="var(--text-muted)"
                      >
                        {busy === 'archive' ? '…' : 'Archive'}
                      </ActionBtn>
                    )}
                  </div>
                </div>

                {/* Reply preview */}
                {preview && (
                  <div className="mt-3 pl-12">
                    <p
                      className="text-sm"
                      style={{
                        color: 'var(--text-muted)',
                        lineHeight: 1.65,
                        whiteSpace: isExpanded ? 'pre-line' : 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {isExpanded ? preview : preview.slice(0, 140) + (preview.length > 140 ? '…' : '')}
                    </p>
                    {preview.length > 140 && (
                      <button
                        onClick={() => setExpanded(isExpanded ? null : reply.id)}
                        className="text-xs mt-1 font-medium"
                        style={{ color: 'var(--accent)' }}
                      >
                        {isExpanded ? 'Show less' : 'Show full reply'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const ActionBtn = ({ onClick, disabled, bg, color, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-55"
    style={{ background: bg, color }}
  >
    {children}
  </button>
)
