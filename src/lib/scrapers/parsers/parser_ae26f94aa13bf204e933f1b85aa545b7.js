const titleFull = $('meta[property="og:title"]').attr('content');
const jobTitle = titleFull.split(' ')[0];
const companyName = titleFull.split('at ')[1].split(',')[0].trim();
const location = titleFull.split('in ')[1].split(',')[0].trim();
const description = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content');
const sourceUrl = $('link[rel="canonical"]').attr('href');
const postedDateIsoString = $('meta[property="article:published_time"]').attr('content');
const job = {
  title: jobTitle,
  companyName: companyName,
  description: description,
  location: location,
  jobType: "",
  sourceUrl: sourceUrl,
  postedDateIsoString: postedDateIsoString,
  deadlineIsoString: null,
  salaryMin: 0,
  salaryMax: 0,
  salaryCurrency: ""
};
result.push(job);