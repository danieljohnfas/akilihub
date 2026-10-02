const jobContainers = $('article');
if (jobContainers.length === 0) {
  const paragraphs = $('p');
  jobContainers = paragraphs.filter(function() {
    return $(this).text().trim().toLowerCase().includes('vacancy') || $(this).text().trim().toLowerCase().includes('job');
  });
}
jobContainers.each(function() {
  const job = {};
  const title = $(this).find('h2, h3, h4, h5, h6').first();
  if (title.length > 0) {
    job.title = title.text().trim();
    const companyName = $(this).find('strong, b').filter(function() {
      return $(this).text().trim().toLowerCase().includes('university') || $(this).text().trim().toLowerCase().includes('company');
    });
    if (companyName.length > 0) {
      job.companyName = companyName.text().trim();
    }
    const description = $(this).find('p').first();
    if (description.length > 0) {
      job.description = description.text().trim();
    }
    const location = $(this).find('span').filter(function() {
      return $(this).text().trim().toLowerCase().includes('