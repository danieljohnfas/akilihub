$('article.job, .job-listing, .job-card, .vacancy, .position').each((i, el) => {
  const title = $(el).find('h2, h3, .title').first().text().trim();
  if (title) {
    result.push({
      title: title,
      companyName: $(el).find('.company, .company-name').first().text().trim(),
      description: $(el).find('.description, .summary').first().text().trim(),
      location: $(el).find('.location').first().text().trim(),
      sourceUrl: $(el).find('a').attr('href') || '',
    });
  }
});