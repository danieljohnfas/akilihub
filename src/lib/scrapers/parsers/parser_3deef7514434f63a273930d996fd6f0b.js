if ($('article').length > 0) {
  $('article').each((index, element) => {
    const $element = $(element);
    const title = $element.find('h1.entry-title, h2.entry-title').text().trim();
    const companyName = $element.find('.entry-meta span.fn, .company-name').text().trim();
    const description = $element.find('.entry-content, .job-description').text().trim();
    const location = $element.find('.location, .job-location').text().trim();
    const jobType = $element.find('.job-type').text().trim().toLowerCase().replace(/\s+/g, '_');
    const sourceUrl = $element.find('.job-link, .apply-now a').attr('href');
    const postedDateIsoString = $element.find('.posted-date').text().trim();
    const deadlineIsoString = $element.find('.deadline').text().trim();
    const salaryText = $element.find('.salary').text().trim();
    const salaryParts = salaryText.match(/(\d{1,3}(,\d{3})*)(\s*-\s*(\d{1,3}(,\d{3})*))?\s*([a-zA-Z]*)/);
    const salaryMin = salaryParts ? parseInt(salaryParts[1].replace(/,/g, '')) : null;
    const salaryMax = salaryParts && salaryParts[4] ? parseInt(salaryParts[4].replace(/,/g, '')) : null;
    const salaryCurrency = salaryParts && salaryParts[6] ? salaryParts[6].toUpperCase() : null;

    if (title) {
      result.push({
        title,
        companyName,
        description,
        location,
        jobType,
        sourceUrl,
        postedDateIsoString,
        deadlineIsoString,
        salaryMin,
        salaryMax,
        salaryCurrency
      });
    }
  });
}