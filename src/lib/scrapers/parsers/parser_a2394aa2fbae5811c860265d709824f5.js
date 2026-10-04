let jobData = null;
$('script[type="application/ld+json"]').each((_, el) => {
  try {
    const jsonText = $(el).contents().text();
    const parsed = JSON.parse(jsonText);
    const candidates = Array.isArray(parsed)
      ? parsed
      : parsed['@graph']
      ? parsed['@graph']
      : [parsed];
    candidates.forEach(node => {
      const type = node['@type'];
      if (type) {
        const isBlogPosting = Array.isArray(type)
          ? type.includes('BlogPosting')
          : type === 'BlogPosting';
        if (isBlogPosting) {
          jobData = node;
        }
      }
    });
  } catch (e) {
    // ignore malformed JSON
  }
});

if (jobData) {
  let rawTitle = jobData.headline || '';
  rawTitle = rawTitle.replace(/\s*-\s*CAREERS$/i, '').trim();

  let title = rawTitle;
  let companyName = '';

  const titleMatch = rawTitle.match(/^(.*)\s+job\s+at\s+(.+?)(?:\s+\d{4})?$/i);
  if (titleMatch) {
    title = titleMatch[1].trim();
    companyName = titleMatch[2].trim();
  }

  const description = jobData.description || '';
  const sourceUrl = $('link[rel="canonical"]').attr('href') || '';
  const postedDateIsoString =
    jobData.datePublished ||
    $('meta[property="article:published_time"]').attr('content') ||
    '';

  const jobObj = {
    title,
    companyName,
    description,
    location: '',
    jobType: '',
    sourceUrl,
    postedDateIsoString,
    deadlineIsoString: '',
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: ''
  };

  result.push(jobObj);
}