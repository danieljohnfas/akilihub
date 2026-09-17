const containers = $('.job-listing, .job, [class*="job"], [class*="vacancy"]');
containers.each(function() {
  const title = $(this).find('[class*="title"], h2, h3').first().text().trim();
  if (title) {
    result.push({ title: title });
  }
});