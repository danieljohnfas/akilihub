const title = ($('meta[property="og:title"]').attr('content') || $('h1').first().text()).trim()
if (!title) { /* no identifiable job title */ } else {
  const companyName = ($('meta[property="og:site_name"]').attr('content') || '').trim()
  const sourceUrl = ($('link[rel="canonical"]').attr('href') || '').trim()
  const description = ($('meta[name="description"]').attr('content') || $('#content').text()).trim()
  const pageText = $.root().text()

  let location
  const locMatch = pageText.match(/Location\s*[:\-]\s*([^\n\r]+)/i)
  if (locMatch) location = locMatch[1].trim()

  let postedDateIsoString
  const updatedMeta = $('meta[property="og:updated_time"]').attr('content')
  if (updatedMeta && !isNaN(updatedMeta)) {
    postedDateIsoString = new Date(parseInt(updatedMeta, 10) * 1000).toISOString()
  } else {
    const postMatch = pageText.match(/Posting Date\s*[:\-]\s*([^\n\r]+)/i)
    if (postMatch) {
      const d = new Date(postMatch[1].trim())
      if (!isNaN(d)) postedDateIsoString = d.toISOString()
    }
  }

  let deadlineIsoString
  const deadlineMatch = pageText.match(/Deadline\s*[:\-]\s*([^\n\r]+)/i) ||
                        pageText.match(/Closing Date\s*[:\-]\s*([^\n\r]+)/i)
  if (deadlineMatch) {
    const d = new Date(deadlineMatch[1].trim())
    if (!isNaN(d)) deadlineIsoString = d.toISOString()
  }

  let jobType
  const typeText = pageText.toLowerCase()
  if (typeText.includes('full-time') || typeText.includes('full time')) jobType = 'full_time'
  else if (typeText.includes('part-time') || typeText.includes('part time')) jobType = 'part_time'
  else if (typeText.includes('contract')) jobType = 'contract'
  else if (typeText.includes('internship') || typeText.includes('intern')) jobType = 'internship'
  else if (typeText.includes('remote')) jobType = 'remote'

  let salaryMin, salaryMax, salaryCurrency
  const salaryMatch = pageText.match(/Salary\s*[:\-]\s*([\$\€£]?)(\d[\d,\.]*)\s*(?:-|\sto\s)\s*([\$\€£]?)(\d[\d,\.]*)/i)
  if (salaryMatch) {
    salaryCurrency = salaryMatch[1] || salaryMatch[3] || ''
    salaryMin = parseFloat(salaryMatch[2].replace(/[,]/g, ''))
    salaryMax = parseFloat(salaryMatch[4].replace(/[,]/g, ''))
  } else {
    const singleSalary = pageText.match(/Salary\s*[:\-]\s*([\$\€£]?)(\d[\d,\.]*)/i)
    if (singleSalary) {
      salaryCurrency = singleSalary[1] || ''
      salaryMin = salaryMax = parseFloat(singleSalary[2].replace(/[,]/g, ''))
    }
  }

  const job = {
    title,
    companyName: companyName || undefined,
    description: description || undefined,
    location: location || undefined,
    jobType: jobType || undefined,
    sourceUrl: sourceUrl || undefined,
    postedDateIsoString: postedDateIsoString || undefined,
    deadlineIsoString: deadlineIsoString || undefined,
    salaryMin: salaryMin !== undefined ? salaryMin : undefined,
    salaryMax: salaryMax !== undefined ? salaryMax : undefined,
    salaryCurrency: salaryCurrency || undefined
  }

  result.push(job)
}