try {
  const article = $('.post-content, .entry-content, .content, article').first()
  if (!article.length) {
    // No main content found
    throw new Error('No article container')
  }
  const postedMeta = $('meta[property="article:published_time"], meta[name="article:published_time"]').attr('content') ||
                     $('meta[property="og:published_time"], meta[name="og:published_time"]').attr('content') ||
                     ''
  const listItems = article.find('li')
  if (!listItems.length) {
    // Try paragraphs that might list jobs
    const paragraphs = article.find('p')
    paragraphs.each((_, p) => {
      const txt = $(p).text().trim()
      if (!txt) return
      const possible = txt.match(/^[\w\s\-\–\:\,]+$/)
      if (!possible) return
      const dashIdx = txt.indexOf(' - ')
      const colonIdx = txt.indexOf(': ')
      let title = txt
      if (dashIdx > -1) title = txt.substring(0, dashIdx).trim()
      else if (colonIdx > -1) title = txt.substring(0, colonIdx).trim()
      if (title.split(' ').length < 2) return
      const job = {
        title,
        description: txt,
        sourceUrl: typeof window !== 'undefined' && window.location ? window.location.href : '',
        postedDateIsoString: postedMeta
      }
      result.push(job)
    })
    throw new Error('No list items')
  }
  listItems.each((_, el) => {
    const txt = $(el).text().trim()
    if (!txt) return
    const dashIdx = txt.indexOf(' - ')
    const colonIdx = txt.indexOf(': ')
    let title = txt
    if (dashIdx > -1) title = txt.substring(0, dashIdx).trim()
    else if (colonIdx > -1) title = txt.substring(0, colonIdx).trim()
    if (title.split(' ').length < 2) return
    const job = {
      title,
      description: txt,
      sourceUrl: typeof window !== 'undefined' && window.location ? window.location.href : '',
      postedDateIsoString: postedMeta
    }
    // Attempt to extract location (e.g., after title in parentheses)
    const locMatch = txt.match(/\(([^)]+)\)/)
    if (locMatch) job.location = locMatch[1].trim()
    // Attempt to extract salary range
    const salaryMatch = txt.match(/([\$€£]\s?\d[\d,\.]*)\s*[-–]\s*([\$€£]\s?\d[\d,\.]*)/)
    if (salaryMatch) {
      const parseNum = s => Number(s.replace(/[^0-9\.]/g, ''))
      job.salaryMin = parseNum(salaryMatch[1])
      job.salaryMax = parseNum(salaryMatch[2])
      const curMatch = salaryMatch[1].match(/[$€£]/)
      if (curMatch) job.salaryCurrency = curMatch[0]
    }
    result.push(job)
  })
} catch (e) {
  // If any step fails, ensure result stays an array (possibly empty)
}