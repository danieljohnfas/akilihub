// Prepare basic page info
const sourceUrl = $('meta[property="og:url"]').attr('content')?.trim() || ''
const companyName = $('meta[property="og:site_name"]').attr('content')?.trim() || ''

// Helper to parse dates to ISO
function parseDate(str) {
  const d = Date.parse(str)
  return isNaN(d) ? '' : new Date(d).toISOString()
}

// Helper to extract salary information
function extractSalary(text) {
  const match = text.match(/([\d,]+)\s*[-to]+\s*([\d,]+)\s*(USD|TZS|EUR|KES|UGX|GBP|RWF|ZMW)?/i)
  if (!match) return {}
  const min = Number(match[1].replace(/,/g, ''))
  const max = Number(match[2].replace(/,/g, ''))
  const currency = match[3] ? match[3].toUpperCase() : ''
  return { salaryMin: min, salaryMax: max, salaryCurrency: currency }
}

// Helper to detect job type
function detectJobType(text) {
  const lowered = text.toLowerCase()
  if (/\bfull[-\s]?time\b/.test(lowered)) return 'full_time'
  if (/\bpart[-\s]?time\b/.test(lowered)) return 'part_time'
  if (/\bcontract\b/.test(lowered)) return 'contract'
  if (/\binternship\b/.test(lowered)) return 'internship'
  if (/\bremote\b/.test(lowered)) return 'remote'
  return ''
}

// Main extraction: treat each heading as a possible job entry
$('h2, h3, h4').each((_, elem) => {
  const $head = $(elem)
  const title = $head.text().trim()
  if (!title) return

  // Gather description until next heading of same or higher level
  let descriptionParts = []
  let $next = $head.next()
  while ($next.length && !/^h[2-4]$/i.test($next[0].tagName)) {
    if ($next.is('p, li, div')) descriptionParts.push($next.text().trim())
    $next = $next.next()
  }
  const description = descriptionParts.filter(Boolean).join(' ')

  // Basic validation: ensure description contains some job‑like details
  if (!description) return

  // Extract location
  let location = ''
  const locMatch = description.match(/Location\s*[:\-]\s*([A-Za-z0-9 ,]+)/i)
  if (locMatch) location = locMatch[1].trim()

  // Extract posted date
  let postedDateIsoString = ''
  const postedMatch = description.match(/Posted\s*[:\-]\s*([A-Za-z0-9 ,]+(?:\d{4}))/i)
  if (postedMatch) postedDateIsoString = parseDate(postedMatch[1])

  // Extract application deadline
  let deadlineIsoString = ''
  const deadlineMatch = description.match(/Application Deadline\s*[:\-]\s*([A-Za-z0-9 ,]+(?:\d{4}))/i)
  if (deadlineMatch) deadlineIsoString = parseDate(deadlineMatch[1])

  // Salary
  const salaryInfo = extractSalary(description)

  // Job type
  const jobType = detectJobType(description)

  // Build job object
  const job = {
    title,
    companyName,
    description,
    location,
    jobType,
    sourceUrl,
    postedDateIsoString,
    deadlineIsoString,
    ...salaryInfo
  }

  result.push(job)
})