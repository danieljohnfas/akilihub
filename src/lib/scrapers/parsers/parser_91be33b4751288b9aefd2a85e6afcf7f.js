$('.o_job_detail').each(function() {
  const job = {};
  job.title = $(this).find('.o_job_title').text().trim();
  job.companyName = $(this).find('.o_company_name').text().trim();
  job.description = $(this).find('.o_job_description').text().trim();
  job.location = $(this).find('.o_job_location').text().trim();
  job.sourceUrl = 'http://pst.or.tz' + $(this).find('.o_job_detail').attr('data-url');
  result.push(job);
});