result = []

const jobContainers = $('.ast-archive-description .ast-article-post')

jobContainers.each((index, container) => {
  const $container = $(container)
  const jobTitle = $container.find('.entry-title').text().trim()
  const companyName = $container.find('.ast-archive-meta a').text().trim()
  const description = $container.find('.entry-content').text().trim()
  const location = $container.find('.location').text().trim()
  const jobType = $container.find('.job-type').text().trim().toLowerCase()
  const sourceUrl = $container.find('.entry-title a').attr('href')
  const postedDateIsoString = $container.find('.posted-date').attr('datetime')
  const deadlineIsoString = $container.find('.deadline').attr('datetime')
  const salaryText = $container.find('.salary').text().trim()
  const salaryParts = salaryText.match(/\d+/g)
  const salaryMin = salaryParts ? parseInt(salaryParts[0], 10) : null
  const salaryMax = salaryParts && salaryParts.length > 1 ? parseInt(salaryParts[1], 10) : null
  const salaryCurrency = salaryText.match(/[a-zA-Z]+/)[0] || null

  result.push({
    title: jobTitle,
    companyName: companyName,
    description: description,
    location: location,
    jobType: jobType,
    sourceUrl: sourceUrl,
    postedDateIsoString: postedDateIsoString,
    deadlineIsoString: deadlineIsoString,
    salaryMin: salaryMin,
    salaryMax: salaryMax,
    salaryCurrency: salaryCurrency
  })
})