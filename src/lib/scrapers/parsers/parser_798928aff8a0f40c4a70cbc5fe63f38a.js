result.push({
  title: $('meta[property="og:title"]').attr('content'),
  companyName: $('title').text().split(' at ')[1].split(', ')[0],
  description: $('meta[property="og:description"]').attr('content'),
  location: $('meta[name="description"]').attr('content').split(', ')[1],
  jobType: null,
  sourceUrl: $('meta[property="og:url"]').attr('content'),
  postedDateIsoString: $('script[type="application/ld+json"]').text().match(/"datePublished":"(.*?)"/)[1],
  deadlineIsoString: null,
  salaryMin: null,
  salaryMax: null,
  salaryCurrency: null
});