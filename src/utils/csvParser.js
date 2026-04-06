/**
 * Parses a CSV string into an array of contact objects.
 * Required columns: name, email
 * Optional: company, industry, website
 */
export function parseCSV(csvText) {
  const lines = csvText.trim().split(/\r?\n/)
  if (lines.length < 2) {
    return { valid: [], rejected: [], error: 'CSV must have a header row and at least one data row.' }
  }

  // Parse header
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'))

  const requiredCols = ['name', 'email']
  const missingRequired = requiredCols.filter((col) => !header.includes(col))
  if (missingRequired.length > 0) {
    return {
      valid: [],
      rejected: [],
      error: `Missing required columns: ${missingRequired.join(', ')}. Your CSV must include: name, email`,
    }
  }

  const valid = []
  const rejected = []
  const seenEmails = new Set()

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = parseCSVLine(line)
    const row = {}
    header.forEach((col, idx) => {
      row[col] = (values[idx] || '').trim()
    })

    const rowNum = i + 1
    const reasons = []

    if (!row.name) reasons.push('Missing name')
    if (!row.email) reasons.push('Missing email')
    else if (!isValidEmail(row.email)) reasons.push('Invalid email format')
    else if (seenEmails.has(row.email.toLowerCase())) reasons.push('Duplicate email')

    if (reasons.length > 0) {
      rejected.push({ row: rowNum, data: row, reason: reasons.join('; ') })
      continue
    }

    seenEmails.add(row.email.toLowerCase())
    valid.push({
      id: `contact_${Date.now()}_${i}`,
      name: row.name,
      email: row.email,
      company: row.company || '',
      industry: row.industry || '',
      website: row.website || '',
      status: 'pending',
      sent_at: '',
      opened: false,
      replied: false,
      error: '',
    })
  }

  return { valid, rejected }
}

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
