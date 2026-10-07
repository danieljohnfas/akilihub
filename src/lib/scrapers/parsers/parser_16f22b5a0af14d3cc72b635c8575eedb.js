const jsonLdScript = $('script[type="application/ld+json"]').first().contents().text().trim()
if (jsonLdScript) {
  try {
    const data = JSON.parse(jsonLdScript)
    const graph = Array.isArray(data['@graph']) ? data['@graph'] : [data]
    const searchPage = graph.find(item => item['@type'] === 'SearchResultsPage')
    const items = searchPage?.mainEntity?.itemListElement
    if (Array.isArray(items)) {
      items.forEach(listItem => {
        const jobInfo = listItem?.item
        if (jobInfo && typeof jobInfo.name === 'string' && typeof jobInfo.url === 'string') {
          const job = {
            title: jobInfo.name.trim(),
            sourceUrl: jobInfo.url.trim()
          }
          if (jobInfo.name.includes(' at ')) {
            const parts = jobInfo.name.split(' at ')
            job.title = parts[0].trim()
            job.companyName = parts.slice(1).join(' at ').trim()
          }
          result.push(job)
        }
      })
    }
  } catch (e) {
    // If JSON parsing fails, leave result empty
  }
}