const jobContainer = $('.single-post');

if (jobContainer.length > 0) {
  const jobTitle = jobContainer.find('h1.entry-title').text().trim();
  const companyName = jobContainer.find('.entry-author a').text().trim();
  const description = jobContainer.find('.entry-content p').text().trim();
  const location = jobContainer.find('meta[property="article:section"]').attr('content').trim();
  const sourceUrl = jobContainer.find('link[rel="canonical"]').attr('href').trim();
  const postedDateIsoString = jobContainer.find('meta[property="article:published_time"]').attr('content').trim();
  const deadline = jobContainer.find('.deadline').text().trim();
  const deadlineIsoString = new Date(deadline).toISOString() || null;

  const job = {
    title: jobTitle,
    companyName: companyName,
    description: description,
    location: location,
    sourceUrl: sourceUrl,
    postedDateIsoString: postedDateIsoString,
    deadlineIsoString: deadlineIsoString
  };

  result.push(job);
}