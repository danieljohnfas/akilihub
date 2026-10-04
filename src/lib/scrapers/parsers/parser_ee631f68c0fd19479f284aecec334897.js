$('script[type="application/ld+json"]').each((i, el) => {
  const txt = $(el).contents().text().trim()
  if (!txt) return
  try {
    const data = JSON.parse(txt)
    const items = Array.isArray(data) ? data : [data]
    items.forEach(item => {
      if (item['@type'] === 'JobPosting') {
        const job = {}
        if (item.title) job.title = item.title
        if (item.hiringOrganization && item.hiringOrganization.name) job.companyName = item.hiringOrganization.name
        if (item.description) job.description = item.description
        if (item.jobLocation && item.jobLocation.address) {
          const addr = item.jobLocation.address
          if (addr.addressLocality) job.location = addr.addressLocality
          else if (addr.streetAddress) job.location = addr.streetAddress
        }
        if (item.employmentType) {
          const map = {
            FULL_TIME: 'full_time',
            PART_TIME: 'part_time',
            CONTRACT: 'contract',
            INTERNSHIP: 'internship',
            REMOTE: 'remote'
          }
          const typeKey = item.employmentType.toString().toUpperCase()
          job.jobType = map[typeKey] || item.employmentType.toString().toLowerCase()
        }
        if (item.url) job.sourceUrl = item.url
        if (item.datePosted) job.postedDateIsoString = item.datePosted
        if (item.validThrough) job.deadlineIsoString = item.validThrough
        if (item.baseSalary) {
          const salary = item.baseSalary
          if (salary.value) {
            if (salary.value.minValue) job.salaryMin = Number(salary.value.minValue)
            if (salary.value.maxValue) job.salaryMax = Number(salary.value.maxValue)
            if (salary.value.currency) job.salaryCurrency = salary.value.currency
          }
        }
        result.push(job)
      }
    })
  } catch (e) {}
})