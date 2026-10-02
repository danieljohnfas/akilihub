const jobContainers = $('.job-listing, .job, .posting, .vacancy')
jobContainers.each((i, el) => {
  const $el = $(el)
  const title = $el.find('.title, h1, h2, h3').first().text().trim()
  if (!title) return
  const companyName = $el.find('.company, .company-name').first().text().trim() || undefined
  const description = $el.find('.description, .job-desc').first().text().trim() || undefined
  const location = $el.find('.location').first().text().trim() || undefined
  const typeText = $el.find('.type, .job-type').first().text().toLowerCase()
  let jobType
  if (typeText.includes('full')) jobType = 'full_time'
  else if (typeText.includes('part')) jobType = 'part_time'
  else if (typeText.includes('contract')) jobType = 'contract'
  else if (typeText.includes('intern')) jobType = 'internship'
  else if (typeText.includes('remote')) jobType = 'remote'
  const sourceUrl = $el.find('a.apply').attr('href') || undefined
  const postedRaw = $el.find('.date-posted').attr('datetime') || $el.find('.date-posted').text()
  const postedDateIsoString = postedRaw ? new Date(postedRaw).toISOString() : undefined
  const deadlineRaw = $el.find('.deadline').attr('datetime') || $el.find('.deadline').text()
  const deadlineIsoString = deadlineRaw ? new Date(deadlineRaw).toISOString() : undefined
  const salaryText = $el.find('.salary').text()
  let salaryMin, salaryMax, salaryCurrency
  if (salaryText) {
    const clean = salaryText.replace(/[,]/g, '')
    const match = clean.match(/([A-Za-z]{3})\s?(\d+)(?:\s?[-–]\s?(\d+))?/)
    if (match) {
      salaryCurrency = match[1]
      salaryMin = parseInt(match[2], 10)
      if (match[3]) salaryMax = parseInt(match[3], 10)
    }
  }
  result.push({
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
  })
})