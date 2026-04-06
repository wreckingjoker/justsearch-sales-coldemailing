const BASE = import.meta.env.VITE_N8N_BASE_URL

const handle = async (res) => {
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  return res.json()
}

export const uploadContacts = (contacts) =>
  fetch(`${BASE}/webhook/upload-contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contacts }),
  }).then(handle)

export const getContacts = () =>
  fetch(`${BASE}/webhook/contacts`).then(handle)

export const getStats = () =>
  fetch(`${BASE}/webhook/stats`).then(handle)

export const startCampaign = () =>
  fetch(`${BASE}/webhook/start`, { method: 'POST' }).then(handle)

export const pauseCampaign = () =>
  fetch(`${BASE}/webhook/pause`, { method: 'POST' }).then(handle)

/**
 * Save settings — includes cc field for CC recipients
 * @param {{ dailyLimit: number, sendTime: string, timezone: string, replyTo: string, cc: string, days: string[] }} settings
 */
export const saveSettings = (settings) =>
  fetch(`${BASE}/webhook/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  }).then(handle)

export const saveTemplate = (promptTemplate, attachment = null) =>
  fetch(`${BASE}/webhook/template`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      promptTemplate,
      ...(attachment && { attachmentBase64: attachment.base64, attachmentName: attachment.name }),
    }),
  }).then(handle)

export const getReplies = () =>
  fetch(`${BASE}/webhook/replies`).then(handle)

export const markAsLead = (contactId) =>
  fetch(`${BASE}/webhook/mark-lead`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contactId }),
  }).then(handle)

export const archiveReply = (contactId) =>
  fetch(`${BASE}/webhook/archive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contactId }),
  }).then(handle)

export const previewEmail = (contact) =>
  fetch(`${BASE}/webhook/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contact }),
  }).then(handle)

export const sendNow = (intervalMinutes = 1) =>
  fetch(`${BASE}/webhook/send-now`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ intervalMinutes }),
  }).then(handle)

export const stopSending = () =>
  fetch(`${BASE}/webhook/stop`, { method: 'POST' }).then(handle)
