const job = {
  title: $('meta[property="og:title"]').attr('content'),
  companyName: 'Vodacom',
  description: $('meta[property="og:description"]').attr('content'),
  location: 'Mbeya, Tanzania',
  jobType: 'Full Time',
  sourceUrl: $('meta[property="og:url"]').attr('content'),
  postedDateIsoString: $('meta[property="article:published_time"]').attr('content'),
  deadlineIsoString: null,
  salaryMin: null,
  salaryMax: null,
  salaryCurrency: null
};

result.push(job);