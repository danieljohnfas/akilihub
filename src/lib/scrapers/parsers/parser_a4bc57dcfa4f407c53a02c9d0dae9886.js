const sourceUrl = $('link[rel="canonical"]').attr('href') || $('meta[property="og:url"]').attr('content') || '';
let companyName = '';
const pageTitle = $('title').text();
const compMatch = pageTitle.match(/at\s+([^|]+)/i);
if (compMatch) companyName = compMatch[1].trim();
const jobSelectors = 'li, h2, h3, p strong, p b';
$(jobSelectors).each((_, el) => {
  const rawText = $(el).text().trim();
  if (!rawText) return;
  const lower = rawText.toLowerCase();
  const keywords = ['manager','lead','engineer','officer','supervisor','assistant','coordinator','intern','technician','analyst','designer','director','specialist','consultant','architect'];
  if (!keywords.some(k => lower.includes(k))) return;
  let title = rawText;
  let description = '';
  const parentTag = $(el).parent();
  if (parentTag.length && !['li','h2','h3'].includes(parentTag[0].tagName)) {
    description = parentTag.text().trim();
  }
  result.push({
    title,
    companyName,
    description,
    location: '',
    jobType: '',
    sourceUrl,
    postedDateIsoString: '',
    deadlineIsoString: '',
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: ''
  });
});