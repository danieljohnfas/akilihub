// Select the main article/content area
const contentRoot = $('article, .post-content, .entry-content, .content').first()
if (!contentRoot.length) {
  // No recognizable content area, leave result empty
} else {
  // Helper to clean text
  const clean = (txt) => txt.replace(/\s+/g, ' ').trim()

  // Extract generic page info for fallback fields
  const sourceUrl = $('meta[property="og:url"]').attr('content') || ''
  const postedDateIsoString = $('meta[property="article:published_time"]').attr('content') || ''
  const pageTitle = clean($('title').text() || '')
  // Attempt to derive company name from page title (e.g., "... At University of Dar es Salaam ...")
  let companyName = ''
  const atMatch = pageTitle.match(/at\s+([^,|-]+)/i)
  if (atMatch) {
    companyName = clean(atMatch[1])
  }

  // Define a regex to recognise probable job headings
  const jobHeadingRegex = /(vacanc|position|assistant|lecturer|engineer|manager|officer|intern|analyst|coordinator|specialist)/i

  // Gather all headings that could represent a job entry
  const possibleHeadings = contentRoot.find('h1, h2, h3, h4, h5, h6').filter((i, el) => {
    const txt = clean($(el).text())
    return txt && jobHeadingRegex.test(txt)
  })

  possibleHeadings.each((i, heading) => {
    const $heading = $(heading)
    const title = clean($heading.text())
    if (!title) return

    // Collect description text until the next heading of same or higher level
    const descriptionParts = []
    let $sibling = $heading.next()
    while ($sibling.length && !$sibling.is('h1, h2, h3, h4, h5, h6')) {
      if ($sibling.is('p, div, ul, ol')) {
        descriptionParts.push(clean($sibling.text()))
      }
      $sibling = $sibling.next()
    }
    const description = descriptionParts.filter(Boolean).join('\n')

    // Attempt to extract location (simple heuristic looking for city/country patterns)
    let location = ''
    const locMatch = description.match(/Location[:\s]*([A-Za-z\s,.-]+)/i)
    if (locMatch) location = clean(locMatch[1])

    // Attempt to infer job type
    let jobType = ''
    const typeMap = {
      full_time: /full[-\s]?time/i,
      part_time: /part[-\s]?time/i,
      contract: /contract/i,
      internship: /internship|intern/i,
      remote: /remote/i
    }
    for (const [type, rgx] of Object.entries(typeMap)) {
      if (rgx.test(description) || rgx.test(title)) {
        jobType = type
        break
      }
    }

    // Salary extraction (first numeric range found)
    let salaryMin = null
    let salaryMax = null
    let salaryCurrency = null
    const salaryMatch = description.match(/([A-Z]{3})?\s?\$?([\d,.]+)\s?[-–]\s?\$?([\d,.]+)/) ||
                         description.match(/([\d,.]+)\s?[-–]\s?([\d,.]+)\s?(USD|EUR|TZS|KES|GBP)/i)
    if (salaryMatch) {
      salaryCurrency = salaryMatch[1] ? salaryMatch[1].toUpperCase() : (salaryMatch[3] || '').toUpperCase()
      salaryMin = parseFloat(salaryMatch[2].replace(/[,]/g, ''))
      salaryMax = parseFloat(salaryMatch[3].replace(/[,]/g, ''))
    }

    // Deadline extraction (look for dates with keywords)
    let deadlineIsoString = ''
    const deadlineMatch = description.match(/deadline[:\s]*([A-Za-z0-9,\/\-\s]+)/i)
    if (deadlineMatch) {
      const parsed = new Date(deadlineMatch[1])
      if (!isNaN(parsed)) deadlineIsoString = parsed.toISOString()
    }

    // Assemble job object
    const job = {
      title,
      companyName,
      description,
      location,
      jobType,
      sourceUrl,
      postedDateIsoString,
      deadlineIsoString,
      salaryMin,
      salaryMax,
      salaryCurrency
    }

    // Remove undefined/null keys for cleanliness
    Object.keys(job).forEach(k => {
      if (job[k] === '' || job[k] === null || job[k] === undefined) delete job[k]
    })

    result.push(job)
  })
}