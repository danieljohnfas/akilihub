let title = ($('meta[property="og:title"]').attr('content') || $('h1').first().text()).trim()
if (title) {
  let companyName = ''
  let compMatch = title.match(/at\s+(.+?)\s+\d{4}$/i)
  if (compMatch) companyName = compMatch[1].trim()
  let description = $('.entry-content, .post-content, article, .content')
    .first()
    .text()
    .trim()
  let sourceUrl = ($('meta[property="og:url"]').attr('content') || '').trim()
  let postedDateIsoString = (
    $('meta[property="article:published_time"]').attr('content') ||
    $('meta[name="date"]').attr('content') ||
    ''
  ).trim()
  let deadlineIsoString = (
    $('meta[property="article:modified_time"]').attr('content') ||
    ''
  ).trim()
  let location = ''
  if (description) {
    let locMatch = description.match(
      /(Tanzania|Kenya|Uganda|Rwanda|Ethiopia|South Africa|Nigeria|Ghana|Cameroon|Sudan|Egypt|Morocco|Algeria|Angola|Mozambique|Zambia|Zimbabwe|Malawi|Botswana|Namibia|Lesotho|Swaziland|Somalia|Eritrea|Djibouti|Guinea|Sierra Leone|Liberia|Congo|Gambia|Senegal|Tunisia|Libya|Sudan)/i
    )
    if (locMatch) location = locMatch[0]
  }
  let job = {
    title,
    companyName,
    description,
    location,
    sourceUrl,
    postedDateIsoString,
    deadlineIsoString
  }
  result.push(job)
}