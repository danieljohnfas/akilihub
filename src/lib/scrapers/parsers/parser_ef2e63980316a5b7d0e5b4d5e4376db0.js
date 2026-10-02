result = []

if ($('title').text().includes('Jobs') || $('title').text().includes('Careers')) {
  $('.job-listing').each((index, element) => {
    const job = {}
    job.title = $(element).find('.job-title').text().trim()
    job.companyName = $(element).find('.company-name').text().trim()
    job.description = $(element).find('.job-description').text().trim()
    job.location = $(element).find('.job-location').text().trim()
    job.jobType = $(element).find('.job-type').text().trim().toLowerCase().replace(/\s+/g, '_')
    job.sourceUrl = $(element).find('.job-link').attr('href')
    job.postedDateIsoString = $(element).find('.posted-date').attr('datetime')
    job.deadlineIsoString = $(element).find('.deadline').attr('datetime')
    job.salaryMin = $(element).find('.salary-min').text().trim().replace(/\D/g, '')
    job.salaryMax = $(element).find('.salary-max').text().trim().replace(/\D/g, '')
    job.salaryCurrency = $(element).find('.salary-currency').text().trim()
    
    if (job.title && job.companyName) {
      result.push(job)
    }
  })
}