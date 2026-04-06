import { useState } from 'react'
import { saveTemplate, previewEmail } from '../api/n8n'

const DEFAULT_PROMPT = `You are a world-class B2B sales copywriter for Just Search, a digital marketing agency in the UAE specialising in SEO, Google Ads (PPC), social media marketing, and web design. Your goal is to write a cold email that will get a response from a decision-maker.

Just Search's core value proposition: We help UAE businesses get more customers online through data-driven search and social strategies. Our clients typically see 2-4x ROI on their marketing spend within 90 days.

Write a highly personalised, concise cold email (max 180 words) to the contact below. The email must:
1. Open with a specific, relevant observation about their company or industry (not generic)
2. Connect their likely pain point to what Just Search solves
3. End with a single, low-friction CTA (e.g. "Worth a 15-min call this week?")
4. Sound like it was written by a human, not an AI — natural, direct, no buzzwords
5. Use the contact's first name only in the greeting

Do NOT use: "I hope this email finds you well", "I wanted to reach out", "synergy", "leverage", "holistic"

Respond ONLY with a valid JSON object — no preamble, no markdown:
{ "subject": "<subject line>", "body": "<full email body as plain text with line breaks using \\n>" }`

const PdfIcon    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--accent)', flexShrink: 0 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
const SpinnerIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
const SaveIcon   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
const EyeIcon    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>

const BRAND_GIF = 'https://justsearch.ae/wp-content/uploads/2025/06/Just-Search-2.gif'

const MERGE_TAGS = ['{{contact.name}}', '{{contact.company}}', '{{contact.industry}}', '{{contact.website}}']
const HISTORY_KEY     = 'js_template_history'
const MANUAL_KEY      = 'js_manual_template'
const PROMPT_KEY      = 'js_ai_prompt'
const ATTACHMENT_KEY  = 'js_attachment'

const loadHistory = () => { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') } catch { return [] } }
const saveHistory = (t) => {
  const h = [{ template: t, savedAt: new Date().toISOString() }, ...loadHistory()].slice(0, 5)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h))
}

export default function TemplateTab({ showToast }) {
  const [mode, setMode] = useState('ai')
  const [prompt, setPrompt] = useState(
    () => localStorage.getItem(PROMPT_KEY) || DEFAULT_PROMPT
  )
  const [manualTemplate, setManualTemplate] = useState(
    () => localStorage.getItem(MANUAL_KEY) ||
      'Hi {{contact.name}},\n\nI came across {{contact.company}} and wanted to share how Just Search has been helping businesses like yours grow online.\n\n[Your personalised message here]\n\nWorth a quick 15-min call this week?\n\nBest,\nJust Search Sales Team'
  )
  const [attachment, setAttachment] = useState(() => {
    try { return JSON.parse(localStorage.getItem(ATTACHMENT_KEY) || 'null') } catch { return null }
  })
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState(loadHistory)
  const [previewContact, setPreviewContact] = useState({ name: 'Sarah Johnson', company: 'Bloom Interiors', industry: 'Interior Design', website: 'bloominteriors.ae' })
  const [previewResult, setPreviewResult] = useState(null)
  const [previewing, setPreviewing] = useState(false)

  const currentTemplate = mode === 'ai' ? prompt : manualTemplate
  const setCurrentTemplate = mode === 'ai'
    ? (v) => { setPrompt(v); localStorage.setItem(PROMPT_KEY, v) }
    : (v) => { setManualTemplate(v); localStorage.setItem(MANUAL_KEY, v) }
  const charCount = currentTemplate.length
  const tooShort = charCount < 50

  const handleAttachmentUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.type !== 'application/pdf') { showToast('Only PDF files are supported', 'error'); return }
    const reader = new FileReader()
    reader.onload = () => {
      const data = { name: file.name, base64: reader.result.split(',')[1] }
      setAttachment(data)
      localStorage.setItem(ATTACHMENT_KEY, JSON.stringify(data))
      showToast(`${file.name} attached`)
    }
    reader.readAsDataURL(file)
  }

  const removeAttachment = () => {
    setAttachment(null)
    localStorage.removeItem(ATTACHMENT_KEY)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveTemplate(currentTemplate, attachment)
      saveHistory(currentTemplate)
      setHistory(loadHistory())
      showToast('Template saved')
    } catch (err) {
      showToast(`Save failed: ${err.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handlePreview = async () => {
    setPreviewing(true)
    setPreviewResult(null)
    try {
      const result = await previewEmail(previewContact)
      setPreviewResult(result)
    } catch (err) {
      showToast(`Preview failed: ${err.message}`, 'error')
    } finally {
      setPreviewing(false)
    }
  }

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1>Email Template</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Configure how Claude personalises each cold email
          </p>
        </div>

        {/* Mode toggle */}
        <div
          className="flex items-center rounded-lg p-1 gap-1"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
        >
          {[{ id: 'ai', label: '✦ AI Prompt' }, { id: 'manual', label: '✎ Manual' }].map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className="px-3.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150"
              style={{
                background: mode === m.id ? '#fff' : 'transparent',
                color: mode === m.id ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: mode === m.id ? 'var(--shadow-sm)' : 'none',
                letterSpacing: '0.01em',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* ── Editor ── */}
        <div className="lg:col-span-3 space-y-4">
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <label className="label mb-0">
                {mode === 'ai' ? 'AI Personalisation Brief' : 'Manual Template'}
              </label>
              <span
                className="text-xs font-medium tabular-nums"
                style={{ color: tooShort ? 'var(--error)' : 'var(--text-dim)' }}
              >
                {charCount} chars{tooShort ? ' — too short' : ''}
              </span>
            </div>

            <textarea
              value={currentTemplate}
              onChange={(e) => setCurrentTemplate(e.target.value)}
              rows={14}
              className="input resize-none"
              style={{ fontSize: '13px', lineHeight: '1.65' }}
              placeholder={mode === 'ai'
                ? 'Describe what Just Search does and the angle to pitch…'
                : 'Write your template with {{contact.name}}, {{contact.company}} etc.'
              }
            />

            {mode === 'ai' && tooShort && (
              <p className="text-xs" style={{ color: 'var(--error)' }}>
                ⚠ Too short — add your USP, target audience, and desired CTA.
              </p>
            )}

            {mode === 'manual' && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                <p className="text-xs w-full" style={{ color: 'var(--text-muted)' }}>Merge tags:</p>
                {MERGE_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setCurrentTemplate((t) => t + tag)}
                    className="px-2 py-0.5 rounded text-xs font-mono transition-colors"
                    style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}

            {/* PDF Attachment */}
            <div className="pt-1 space-y-2" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
              <label className="label mb-0">Portfolio PDF Attachment</label>
              {attachment ? (
                <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'var(--accent-muted)', border: '1px solid var(--accent)' }}>
                  <PdfIcon />
                  <span className="text-xs font-medium flex-1 truncate" style={{ color: 'var(--accent)' }}>{attachment.name}</span>
                  <button onClick={removeAttachment} className="text-xs" style={{ color: 'var(--text-muted)' }}>✕ Remove</button>
                </div>
              ) : (
                <label className="flex items-center gap-2 cursor-pointer rounded-lg px-3 py-2 transition-colors"
                  style={{ background: 'var(--bg-elevated)', border: '1px dashed var(--border)' }}>
                  <PdfIcon />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Click to attach PDF portfolio</span>
                  <input type="file" accept="application/pdf" className="hidden" onChange={handleAttachmentUpload} />
                </label>
              )}
              <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Attached to every outgoing email. Save template to apply.</p>
            </div>

            {/* Brand GIF */}
            <div className="space-y-2" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
              <div className="flex items-center justify-between">
                <label className="label mb-0">Brand Banner</label>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>Always included</span>
              </div>
              <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <img src={BRAND_GIF} alt="Just Search brand banner" className="w-full block" style={{ maxHeight: '120px', objectFit: 'cover' }} />
              </div>
              <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Appended to the bottom of every outgoing email automatically.</p>
            </div>

            <div className="pt-1">
              <button
                onClick={handleSave}
                disabled={saving || tooShort}
                className="btn-primary disabled:opacity-55"
              >
                {saving
                  ? <><SpinnerIcon /> Saving…</>
                  : <><SaveIcon /> Save Template</>
                }
              </button>
            </div>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="card-surface space-y-2">
              <p className="font-syne text-xs font-semibold" style={{ color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Recent Versions
              </p>
              {history.map((h, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentTemplate(h.template)}
                  className="w-full text-left rounded-lg px-3 py-2.5 text-xs transition-colors hover:bg-white"
                  style={{ border: '1px solid var(--border)' }}
                >
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {new Date(h.savedAt).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span style={{ color: 'var(--text-dim)' }}> — {h.template.slice(0, 60)}…</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Preview ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card space-y-3">
            <h3>Preview Email</h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)', marginTop: '-4px' }}>
              Enter sample contact details to generate a live preview.
            </p>

            <div className="space-y-2.5">
              {[
                { key: 'name',     label: 'Name',     placeholder: 'Sarah Johnson' },
                { key: 'company',  label: 'Company',  placeholder: 'Bloom Interiors' },
                { key: 'industry', label: 'Industry', placeholder: 'Interior Design' },
                { key: 'website',  label: 'Website',  placeholder: 'bloominteriors.ae' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <input
                    type="text"
                    className="input"
                    placeholder={placeholder}
                    value={previewContact[key]}
                    onChange={(e) => setPreviewContact((p) => ({ ...p, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={handlePreview}
              disabled={previewing}
              className="btn-secondary w-full justify-center disabled:opacity-55"
            >
              {previewing
                ? <><SpinnerIcon /> Generating…</>
                : <><EyeIcon /> Generate Preview</>
              }
            </button>
          </div>

          {previewResult && (
            <div className="card space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--success)' }} />
                <h4 style={{ margin: 0 }}>Generated Email</h4>
              </div>
              <div className="rounded-lg p-3.5 space-y-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <div>
                  <p className="font-syne" style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>Subject</p>
                  <p className="text-sm font-semibold">{previewResult.subject || '(no subject)'}</p>
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                  <p className="font-syne" style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>Body</p>
                  <p className="text-xs whitespace-pre-line" style={{ color: 'var(--text-primary)', lineHeight: 1.7 }}>
                    {previewResult.body || '(empty)'}
                  </p>
                  <div className="mt-3 rounded overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                    <img src={BRAND_GIF} alt="Just Search brand banner" className="w-full block" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
