// Determine source URL if available
const sourceUrl = $('meta[property="og:url"]').attr('content') || ''

// Helper to safely parse numbers
function parseNumber(str) {
  if (!str) return null
  const num = parseFloat(str.replace(/[^0-9.,]/g, '').replace(',', '.'))
  return isNaN(num) ? null : num
}

// Identify possible job containers: look for headings that look like job titles
const possibleHeadings = $('.entry-content h2, .entry-content h3, .entry-content .job-title, .entry-content .vacancy-title')

possibleHeadings.each((_, heading) => {
  const $heading = $(heading)
  const title = $heading.text().trim()
  if (!title) return

  // Assume the container is the closest parent that groups related info
  const $container = $heading.closest('article, .job, .vacancy, .post, .entry-content')
  const textBlock = $container.text()

  // Basic validation: ensure the block contains typical job fields
  const hasLocation = /Location[:\s]\s*[^\\n]+/i.test(textBlock)
  const hasDescription = /Description[:\s]\s*[^\\n]+/i.test(textBlock) || textBlock.length > title.length + 20

  if (!hasDescription && !hasLocation) {
    // Not confident this is a real job listing; skip
    return
  }

  const job = {
    title,
    sourceUrl
  }

  // Company name (look for a label)
  const companyMatch = textBlock.match(/Company[:\s]\s*([^\n]+)/i)
  if (companyMatch) job.companyName = companyMatch[1].trim()

  // Location
  const locationMatch = textBlock.match(/Location[:\s]\s*([^\n]+)/i)
  if (locationMatch) job.location = locationMatch[1].trim()

  // Description (grab paragraph after heading if possible)
  const $desc = $heading.nextAll('p, .description, .job-description').first()
  if ($desc && $desc.length) job.description = $desc.text().trim()

  // Job type
  const typeMatch = textBlock.match(/Type[:\s]\s*(Full[-\s]?Time|Part[-\s]?Time|Contract|Internship|Remote)/i)
  if (typeMatch) {
    const type = typeMatch[1].toLowerCase().replace(/\s+/g, '_')
    job.jobType = type
  }

  // Posted date
  const postedMatch = textBlock.match(/Posted[:\s]\s*([A-Za-z0-9 ,\-:]+)/i)
  if (postedMatch) {
    const date = new Date(postedMatch[1])
    if (!isNaN(date)) job.postedDateIsoString = date.toISOString()
  }

  // Deadline
  const deadlineMatch = textBlock.match(/Deadline[:\s]\s*([A-Za-z0-9 ,\-:]+)/i)
  if (deadlineMatch) {
    const date = new Date(deadlineMatch[1])
    if (!isNaN(date)) job.deadlineIsoString = date.toISOString()
  }

  // Salary
  const salaryMatch = textBlock.match(/Salary[:\s]\s*([\d.,]+)\s*[-–]\s*([\d.,]+)\s*([A-Z]{3})?/i)
  if (salaryMatch) {
    const min = parseNumber(salaryMatch[1])
    const max = parseNumber(salaryMatch[2])
    if (min !== null) job.salaryMin = min
    if (max !== null) job.salaryMax = max
    if (salaryMatch[3]) job.salaryCurrency = salaryMatch[3]
  }

  // Only push if we have at least a title
  if (job.title) result.push(job)
})

// If no jobs were found, result stays empty as required.