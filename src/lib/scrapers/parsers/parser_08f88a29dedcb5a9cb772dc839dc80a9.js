const postedDateIsoString = $('meta[property="article:published_time"]').attr('content') || null;
const descMeta = $('meta[property="og:description"]').attr('content') || '';
let companyName = null;
let location = null;
let jobType = null;
let deadlineIsoString = null;
const institutionMatch = descMeta.match(/Institution:\s*([^\\n]+)/i);
if (institutionMatch) companyName = institutionMatch[1].trim();
const locationMatch = descMeta.match(/Location:\s*([^\\n]+)/i);
if (locationMatch) location = locationMatch[1].trim();
const typeMatch = descMeta.match(/Job\s*Type:\s*([^\\n]+)/i);
if (typeMatch) {
  const t = typeMatch[1].trim().toLowerCase();
  if (t.includes('full')) jobType = 'full_time';
  else if (t.includes('part')) jobType = 'part_time';
  else if (t.includes('contract')) jobType = 'contract';
  else if (t.includes('intern')) jobType = 'internship';
  else if (t.includes('remote')) jobType = 'remote';
}
const deadlineMatch = descMeta.match(/Application\s*Deadline:\s*([^\\n]+)/i);
if (deadlineMatch) {
  const d = new Date(deadlineMatch[1].trim());
  if (!isNaN(d)) deadlineIsoString = d.toISOString();
}
$('li').each((_, el) => {
  const txt = $(el).text().trim();
  if (!txt) return;
  // Heuristic: look for a dash or en‑dash separating title from details
  const parts = txt.split(/[-–]/);
  const rawTitle = parts[0].trim();
  if (!rawTitle) return;
  const job = {
    title: rawTitle,
    companyName: companyName,
    description: txt,
    location: location,
    jobType: jobType,
    sourceUrl: window.location ? window.location.href : null,
    postedDateIsoString: postedDateIsoString,
    deadlineIsoString: deadlineIsoString,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null
  };
  result.push(job);
});
if (result.length === 0) {
  const titleMatch = descMeta.match(/Vacancies\s*(\d{4})/i);
  const title = titleMatch ? `Vacancies ${titleMatch[1]}` : null;
  if (title) {
    result.push({
      title,
      companyName,
      description: descMeta,
      location,
      jobType,
      sourceUrl: window.location ? window.location.href : null,
      postedDateIsoString: postedDateIsoString,
      deadlineIsoString: deadlineIsoString,
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null
    });
  }
}