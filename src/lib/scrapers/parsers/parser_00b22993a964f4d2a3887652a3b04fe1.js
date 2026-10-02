result = []

// Check if the HTML contains job listings
if ($('div.job-listing').length > 0) {
  $('div.job-listing').each((index, jobListing) => {
    const title = $(jobListing).find('.job-title').text().trim()
    const companyName = $(jobListing).find('.company-name').text().trim()
    const description = $(jobListing).find('.job-description').text().trim()
    const location = $(jobListing).find('.job-location').text().trim()
    const jobType = $(jobListing).find('.job-type').text().trim().toLowerCase()
    const sourceUrl = $(jobListing).find('.job-link').attr('href')
    const postedDateIsoString = $(jobListing).find('.posted-date').attr('datetime')
    const deadlineIsoString = $(jobListing).find('.deadline').attr('datetime')
    const salaryMin = parseInt($(jobListing).find('.salary-min').text().trim().replace(/[^0-9.-]+/g, ''), 10)
    const salaryMax = parseInt($(jobListing).find('.salary-max').text().trim().replace(/[^0-9.-]+/g, ''), 10)
    const salaryCurrency = $(jobListing).find('.salary-currency').text().trim()

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
} else if ($('article.job-posting').length > 0) {
  $('article.job-posting').each((index, jobPosting) => {
    const title = $(jobPosting).find('h2.job-title').text().trim()
    const companyName = $(jobPosting).find('.company-name').text().trim()
    const description = $(jobPosting).find('.job-description').text().trim()
    const location = $(jobPosting).find('.job-location').text().trim()
    const jobType = $(jobPosting).find('.job-type').text().trim().toLowerCase()
    const sourceUrl = $(jobPosting).find('.job-link').attr('href')
    const postedDateIsoString = $(jobPosting).find('.posted-date').attr('datetime')
    const deadlineIsoString = $(jobPosting).find('.deadline').attr('datetime')
    const salaryMin = parseInt($(jobPosting).find('.salary-min').text().trim().replace(/[^0-9.-]+/g, ''), 10)
    const salaryMax = parseInt($(jobPosting).find('.salary-max').text().trim().replace(/[^0-9.-]+/g, ''), 10)
    const salaryCurrency = $(jobPosting).find('.salary-currency').text().trim()

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
} else {
  // No job listings found
}