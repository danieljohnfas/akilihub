const jobTitle = $('meta[property="og:title"]').attr('content');
const companyName = $('meta[property="og:site_name"]').attr('content');
const description = $('meta[property="og:description"]').attr('content');
const sourceUrl = $('meta[property="og:url"]').attr('content');
const postedDateIsoString = $('meta[property="article:published_time"]').attr('content');
const deadlineIsoString = $('meta[property="article:modified_time"]').attr('content');

if (jobTitle && companyName && description && sourceUrl && postedDateIsoString && deadlineIsoString) {
  const job = {
    title: jobTitle,
    companyName: companyName,
    description: description,
    location: '',
    jobType: '',
    sourceUrl: sourceUrl,
    postedDateIsoString: postedDateIsoString,
    deadlineIsoString: deadlineIsoString,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: ''
  };
  result.push(job);
}