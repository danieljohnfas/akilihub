$('[class*="job"], [class*="career"], article.post').each((i, el) => {
  const $el = $(el);
  const title = $el.find('.job-title, .entry-title, h2, h3').eq(0).text().trim();
  if (!title) return;
  const job = { title };
  if ($el.find('.company-name, .company').length) job.companyName = $el.find('.company-name, .company').eq(0).text().trim();
  if ($el.find('.location, .site-origin').length) job.location = $el.find('.location, .site-origin').eq(0).text().trim();
  if ($el.find('.description, .summary').length) job.description = $el.find('.description, .summary').eq(0).text().trim();
  if ($el.find('a').attr('href')) job.sourceUrl = $el.find('a').eq(0).attr('href');
  result.push(job);
});