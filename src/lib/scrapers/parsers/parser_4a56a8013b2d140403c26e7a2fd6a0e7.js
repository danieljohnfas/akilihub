$('article').each((index, element) => {
  const job = {};

  // Extract job title
  job.title = $(element).find('h1.entry-title').text().trim();

  // Extract company name
  job.companyName = job.title.split(' -')[1]?.split(' Job')[0];

  // Extract job description
  job.description = $(element).find('.entry-content').text().trim();

  // Extract location (assuming it's in the description)
  job.location = job.description.match(/Location: (.+?)[\n\r]/)?.[1]?.trim();

  // Extract job type (assuming it's in the description)
  job.jobType = job.description.match(/Type: (.+?)[\n\r]/)?.[1]?.replace(/\s+/g, '_').toLowerCase();

  // Extract source URL
  job.sourceUrl = $(element).find('.entry-title a').attr('href');

  // Extract posted date (assuming it's in the metadata)
  job.postedDateIsoString = $('meta[property="article:published_time"]').attr('content');

  // Extract deadline (assuming it's in the description)
  job.deadlineIsoString = job.description.match(/Deadline: (.+?)[\n\r]/)?.[1]?.trim();

  // Push the job object to the result array
  result.push(job);
});