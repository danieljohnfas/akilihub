const jobs = [];

const jobContainers = $('h2.entry-title');

jobContainers.each((index, element) => {
  const title = $(element).text().trim();
  const jobLink = $(element).find('a').attr('href');
  const companyName = $('meta[name="description"]').attr('content').split('is inviting')[0].trim();
  const description = $('div.entry-content').text().trim();
  const location = $('div.entry-content').text().match(/Location: (.+?)[\r\n]+/)?.[1].trim() || '';
  const jobType = $('div.entry-content').text().match(/Type: (.+?)[\r\n]+/)?.[1].trim() || '';
  const sourceUrl = $('link[rel="canonical"]').attr('href');
  const postedDateIsoString = $('meta[property="article:published_time"]').attr('content');
  const deadlineIsoString = $('div.entry-content').text().match(/Application Deadline: (.+?)[\r\n]+/)?.[1].trim();
  const salaryMatch = $('div.entry-content').text().match(/Salary: (.+?)[\r\n]+/);
  const salaryMin = salaryMatch ? parseFloat(salaryMatch[1].split(' to ')[0].replace(/,/g, '').replace(/[^0-9.]/g, '')) : null;
  const salaryMax = salaryMatch ? parseFloat(salaryMatch[1].split(' to ')[1].replace(/,/g, '').replace(/[^0-9.]/g, '')) : null;
  const salaryCurrency = salaryMatch ? salaryMatch[1].replace(/\d+ to \d+/g, '').trim().replace(/[, ]+/g, ' ') : null;

  const job = {
    title,
    companyName,
    description,
    location,
    jobType: jobType.toLowerCase(),
    sourceUrl,
    postedDateIsoString,
    deadlineIsoString,
    salaryMin,
    salaryMax,
    salaryCurrency
  };

  jobs.push(job);
});

result.push(...jobs);