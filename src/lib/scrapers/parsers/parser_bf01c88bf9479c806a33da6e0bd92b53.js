$('script[type="application/ld+json"]').each((i, el) => {
  const txt = $(el).contents().text().trim()
  if (!txt) return
  try {
    const data = JSON.parse(txt)
    const items = Array.isArray(data) ? data : data['@graph'] ? data['@graph'] : [data]
    items.forEach(item => {
      if (!item) return
      const type = item['@type']
      const isJob = type === 'JobPosting' || (Array.isArray(type) && type.includes('JobPosting'))
      if (!isJob) return
      const job = {}
      if (item.title) job.title = String(item.title).trim()
      if (item.description) job.description = String(item.description).trim()
      if (item.hiringOrganization && item.hiringOrganization.name) job.companyName = String(item.hiringOrganization.name).trim()
      if (item.jobLocation && item.jobLocation.address) {
        const addr = item.jobLocation.address
        const parts = []
        if (addr.addressLocality) parts.push(addr.addressLocality)
        if (addr.addressRegion) parts.push(addr.addressRegion)
        if (addr.addressCountry) parts.push(addr.addressCountry)
        if (parts.length) job.location = parts.join(', ')
      }
      if (item.employmentType) {
        const et = String(item.employmentType).toLowerCase()
        if (et.includes('full')) job.jobType = 'full_time'
        else if (et.includes('part')) job.jobType = 'part_time'
        else if (et.includes('contract')) job.jobType = 'contract'
        else if (et.includes('intern')) job.jobType = 'internship'
        else if (et.includes('remote')) job.jobType = 'remote'
      }
      if (item.url) job.sourceUrl = String(item.url).trim()
      if (item.datePosted) job.postedDateIsoString = new Date(item.datePosted).toISOString()
      if (item.validThrough) job.deadlineIsoString = new Date(item.validThrough).toISOString()
      if (item.baseSalary) {
        const s = item.baseSalary
        if (s.value) {
          if (s.value.minValue != null) job.salaryMin = Number(s.value.minValue)
          if (s.value.maxValue != null) job.salaryMax = Number(s.value.maxValue)
          if (s.value.currency) job.salaryCurrency = String(s.value.currency)
        } else {
          if (s.minValue != null) job.salaryMin = Number(s.minValue)
          if (s.maxValue != null) job.salaryMax = Number(s.maxValue)
          if (s.currency) job.salaryCurrency = String(s.currency)
        }
      }
      if (job.title) result.push(job)
    })
  } catch (e) {}
})