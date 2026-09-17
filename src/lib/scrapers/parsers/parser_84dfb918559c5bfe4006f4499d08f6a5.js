$('.view-vacancies .views-row, .node--type-vacancy').each(function() {
  var item = $(this);
  var titleLink = item.find('.field--name-title a, .node__title a').first();
  var title = titleLink.text().trim();
  if (!title) return;
  var companyName = 'UNICEF';
  var location = item.find('.field--name-field-job-location .field__item, .location').first().text().trim();
  var description = item.find('.field--name-body .field__item, .field--name-field-description .field__item').first().text().trim();
  var jobTypeRaw = item.find('.field--name-field-contract-type .field__item, .job-type').first().text().trim().toLowerCase();
  var jobType = '';
  if (jobTypeRaw.indexOf('full') > -1) jobType = 'full_time';
  else if (jobTypeRaw.indexOf('part') > -1) jobType = 'part_time';
  else if (jobTypeRaw.indexOf('contract') > -1) jobType = 'contract';
  else if (jobTypeRaw.indexOf('intern') > -1) jobType = 'internship';
  else if (jobTypeRaw.indexOf('remote') > -1 || jobTypeRaw.indexOf('telecommut') > -1) jobType = 'remote';
  var href = titleLink.attr('href') || item.find('a').attr('href') || '';
  var sourceUrl = href.indexOf('http') === 0 ? href : 'https://www.unicef.org' + href;
  result.push({ title: title, companyName: companyName, description: description, location: location, jobType: jobType, sourceUrl: sourceUrl });
});