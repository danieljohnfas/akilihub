(function() {
  var jobTitle = '';
  var companyName = '';
  var description = '';
  var location = '';
  var jobType = '';
  var sourceUrl = '';
  var postedDateIsoString = '';
  var deadlineIsoString = '';
  var salaryMin = undefined;
  var salaryMax = undefined;
  var salaryCurrency = '';

  var $titleEl = $('h1.page-title, .node--type-ct-vacancies h1, .field--name-title span, [property="og:title"]');
  if ($titleEl.length) {
    jobTitle = $titleEl.first().text().trim();
  }

  var $ogSiteName = $('meta[property="og:site_name"]');
  if ($ogSiteName.length) {
    companyName = $ogSiteName.attr('content') || '';
  }

  var $descMeta = $('meta[property="og:description"], meta[name="description"]');
  if ($descMeta.length) {
    description = $descMeta.first().attr('content') || '';
  }

  var $bodyField = $('.field--name-body, .node__content, .field--name-field-job-description');
  if ($bodyField.length) {
    var bodyText = $bodyField.first().text().trim();
    if (bodyText.length > description.length) {
      description = bodyText;
    }
  }

  var $canonical = $('link[rel="canonical"]');
  if ($canonical.length) {
    sourceUrl = $canonical.attr('href') || '';
  }

  var $locField = $('.field--name-field-location, .field--name-field-office, [property="jobLocation"]');
  if ($locField.length) {
    location = $locField.first().text().trim();
  }

  var $dateField = $('.field--name-field-release-date, .field--name-created, .date-display-single');
  if ($dateField.length) {
    postedDateIsoString = $dateField.first().text().trim();
  }

  var $deadlineField = $('.field--name-field-deadline, .field--name-field-application-deadline');
  if ($deadlineField.length) {
    deadlineIsoString = $deadlineField.first().text().trim();
  }

  var $salaryField = $('.field--name-field-salary, .field--name-field-compensation');
  if ($salaryField.length) {
    var salaryText = $salaryField.first().text().trim();
    var salaryMatch = salaryText.match(/[\d,]+\.?\d*/g);
    if (salaryMatch && salaryMatch.length >= 1) {
      salaryMin = parseFloat(salaryMatch[0].replace(/,/g, ''));
    }
    if (salaryMatch && salaryMatch.length >= 2) {
      salaryMax = parseFloat(salaryMatch[1].replace(/,/g, ''));
    }
  }

  var titleLower = jobTitle.toLowerCase();
  if (titleLower.indexOf('intern') !== -1) {
    jobType = 'internship';
  } else if (titleLower.indexOf('part') !== -1) {
    jobType = 'part_time';
  } else if (titleLower.indexOf('contract') !== -1 || titleLower.indexOf('consultant') !== -1) {
    jobType = 'contract';
  } else if (titleLower.indexOf('remote') !== -1) {
    jobType = 'remote';
  } else {
    jobType = 'full_time';
  }

  if (jobTitle && jobTitle.length > 0) {
    result.push({
      title: jobTitle,
      companyName: companyName,
      description: description,
      location: location,
      jobType: jobType,
      sourceUrl: sourceUrl,
      postedDateIsoString: postedDateIsoString,
      deadlineIsoString: deadlineIsoString,
      salaryMin: salaryMin,
      salaryMax: salaryMax,
      salaryCurrency: salaryCurrency
    });
  }
})();