var titleMeta = $('meta[property="og:title"]').attr('content') || $('title').text().trim();
var sourceUrl = $('meta[property="og:url"]').attr('content') || '';
var title = '';
var companyName = '';
var location = '';
if (titleMeta) {
  var titleParts = titleMeta.split('|');
  title = titleParts[0].trim();
  if (titleParts.length > 1) {
    companyName = titleParts[1].trim();
  }
  var locMatch = titleMeta.match(/in\s+([^|]+)/i);
  if (locMatch) {
    location = locMatch[1].trim();
  }
  // Remove generic suffixes like "Jobs", "Jobs in ..." from title
  title = title.replace(/jobs?.*$/i, '').trim();
}
var description = $('article, .entry-content, .post-content, .content').first().text().trim();
if (title && description) {
  var job = {
    title: title,
    companyName: companyName,
    description: description,
    location: location,
    sourceUrl: sourceUrl
  };
  result.push(job);
}