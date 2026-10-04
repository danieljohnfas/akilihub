let ldScript = $('script[type="application/ld+json"]').first().html()
if (ldScript) {
  let data
  try {
    data = JSON.parse(ldScript)
  } catch (e) {
    data = null
  }
  if (data && data['@graph']) {
    const searchPage = data['@graph'].find(g => g['@type'] === 'SearchResultsPage')
    if (searchPage && searchPage.mainEntity && Array.isArray(searchPage.mainEntity.itemListElement)) {
      searchPage.mainEntity.itemListElement.forEach(elem => {
        const item = elem && elem.item
        if (!item || !item.name || !item.url) return
        const fullName = item.name.trim()
        let title = fullName
        let companyName = ''
        const lower = fullName.toLowerCase()
        const idx = lower.lastIndexOf(' job at ')
        if (idx !== -1) {
          title = fullName.substring(0, idx).trim()
          companyName = fullName.substring(idx + 8).trim()
        }
        const job = {
          title,
          companyName,
          sourceUrl: item.url
        }
        result.push(job)
      })
    }
  }
}