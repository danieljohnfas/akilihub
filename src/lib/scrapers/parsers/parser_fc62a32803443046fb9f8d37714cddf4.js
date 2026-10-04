let title = ($('h1').first().text() || '').trim();
if (!title) {
  const ogTitleMeta = $('meta[property="og:title"]').attr('content');
  if (ogTitleMeta) title = ogTitleMeta.trim();
}
if (!title) {
  // no clear job title – treat as non‑job page
  result.length = 0;
} else {
  const job = { title };
  const descriptionMeta = $('meta[name="description"]').attr('content');
  const descriptionText = $('.entry-content').text().trim() || (descriptionMeta ? descriptionMeta.trim() : '');
  if (descriptionText) job.description = descriptionText;
  const sourceUrl = $('meta[property="og:url"]').attr('content');
  if (sourceUrl) job.sourceUrl = sourceUrl.trim();
  const ogTitle = $('meta[property="og:title"]').attr('content');
  if (ogTitle) {
    const parts = ogTitle.split('|');
    if (parts.length > 1) {
      const companyPart = parts[1].replace(/-.*$/, '').trim();
      if (companyPart) job.companyName = companyPart;
    }
  }
  const locMatch = title.match(/in\s+([A-Za-z\s]+)/i);
  if (locMatch && locMatch[1]) job.location = locMatch[1].trim();
  result.push(job);
}