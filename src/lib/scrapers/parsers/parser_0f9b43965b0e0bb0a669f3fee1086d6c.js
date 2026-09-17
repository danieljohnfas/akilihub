const jobContainers = $('[data-job-id], .job-card, .jobs-search-results__list-item, .jobs-job-board-list__item, .job-posting');
jobContainers.each((index, element) => {
  const $el = $(element);
  const title = $el.find('.job-card-list__title, .job-card__title, h3, h2').first().text().trim();
  if (title) {
    result.push({
      title: title,
      companyName: $el.find('.job-card-container__company-name, .job-card__subtitle, .company-name').text().trim(),
      location: $el.find('.job-card-container__metadata-item, .job-card__location, .location').text().trim(),
      sourceUrl: $el.find('a').attr('href') || '',
      description: $el.find('.job-card-description, .description').text().trim()
    });
  }
});