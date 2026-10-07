const jobNodes = $('.job, .joblisting, .career, [class*="job-card"], [class*="job-listing"]');
let extractedCount = 0;

jobNodes.each((index, element) => {
  const titleEl = $(element).find('h2, h3, h4, .job-title, [class*="title"]').first();
  const title = titleEl.text().trim();
  
  const companyEl = $(element).find('.company, .employer, [class*="company"], [class*="employer"]').first();
  const companyName = companyEl.text().trim();

  if (title && companyName) {
    const description = $(element).find('.description, .summary, [class*="description"]').first().text().trim();
    const location = $(element).find('.location, [class*="location"]').first().text().trim();
    const linkEl = $(element).find('a').first();
    const sourceUrl = linkEl.attr('href') || '';
    
    result.push({
      title: title,
      companyName: companyName,
      description: description,
      location: location,
      sourceUrl: sourceUrl
    });
    extractedCount++;
  }
});