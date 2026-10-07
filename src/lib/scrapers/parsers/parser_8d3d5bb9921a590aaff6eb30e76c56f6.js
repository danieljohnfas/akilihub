var selectors = ['div.job-card', 'div.job-offering', 'div.job', 'div.job-detail', 'div.listing', 'tr.job', 'li.job', 'div.job-row', 'div.position'];
var seen = {};
selectors.forEach(function(sel) {
  $(sel).each(function() {
    var $el = $(this);
    var titleSel = $el.find('h1.job-title, h2.job-title, h3.job-title, h4.job-title, .job-title, h1, h2, h3, h4').first();
    var title = titleSel.length ? titleSel.text().trim() : '';
    if (!title) {
      return;
    }
    if (seen[title]) {
      return;
    }
    seen[title] = true;
    var companyNameSel = $el.find('.company-name, .company, .employer, h5, .meta a, .location a');
    var companyName = companyNameSel.length ? companyNameSel.first().text().trim() : '';
    var descriptionSel = $el.find('.description, .details, .job-description, p, .text');
    var description = descriptionSel.length ? descriptionSel.first().text().trim() : '';
    var locationSel = $el.find('.location, .place, .geo');
    var location = locationSel.length ? locationSel.first().text().trim() : '';
    var jobTypeSel = $el.find('.job-type, .employment-type, .schedule');
    var jobType = jobTypeSel.length ? jobTypeSel.first().text().trim().toLowerCase() : '';
    var salarySel = $el.find('.salary, .pay, .compensation');
    var salaryCurrency = salarySel.length ? salarySel.first().text().trim() : '';
    var sourceUrlSel = $el.find('a[href*="job"], a[href*="position"], a[href*="apply"]').first();
    var sourceUrl = '';
    if (sourceUrlSel.length) {
      sourceUrl = sourceUrlSel.attr('href') || '';
    }
    if (!sourceUrl) {
      var anchor = $el.find('a').first();
      if (anchor.length && anchor.attr('href')) {
        sourceUrl = anchor.attr('href');
      }
    }
    var postedDateIsoString = '';
    var deadlineIsoString = '';
    var job = {
      title: title,
      companyName: companyName,
      description: description,
      location: location,
      jobType: jobType,
      sourceUrl: sourceUrl,
      postedDateIsoString: postedDateIsoString,
      deadlineIsoString: deadlineIsoString,
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: salaryCurrency
    };
    result.push(job);
  });
});