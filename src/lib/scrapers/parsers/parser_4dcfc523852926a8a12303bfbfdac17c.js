(function() {
  'use strict';

  function clean(s) {
    if (!s) return '';
    return String(s).replace(/&[a-z]+;/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function text(sel) {
    return $(sel).length ? clean($(sel).text()) : '';
  }

  var canonical = $('link[rel="canonical"]').attr('href') || '';

  var postedDate = '';
  var dateM = $('meta[property="article:published_time"], meta[property="og:published_time"], meta[property="og:updated_time"], meta[name="date"]');
  if (dateM.length) postedDate = dateM.attr('content') || '';
  if (postedDate) postedDate = postedDate.replace(/\+\d{2}:\d{2}$/, '');

  var deadline = '';
  var deadlineText = $('.closing-date, .deadline, time, [itemprop="dueDate"], [itemprop="endDate"]').text();
  var dm = deadlineText.match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}/);
  if (dm) deadline = dm[0].replace(/\//g, '-');

  var jobs = [];

  // Strategy 1: Schema.org Job structured data (most reliable)
  $('script[type="application/ld+json"]').each(function() {
    var $t = $(this);
    try {
      var data = JSON.parse($t.text());
      var walk = function(o) {
        if (o && typeof o === 'object') {
          if (o['@type'] === 'Job' || (Array.isArray(o['@type']) && o['@type'].indexOf('Job') !== -1)) jobs.push(o);
          else if (o['@graph']) o['@graph'].forEach(walk);
          else Object.keys(o).forEach(function(k) { walk(o[k]); });
        }
      };
      walk(data);
    } catch (e) {}
  });

  if (jobs.length) {
    jobs.forEach(function(j) {
      var company = j.hiringOrganization ? (j.hiringOrganization.name || j.hiringOrganization) : '';
      var location = j.jobLocation ? (j.jobLocation.name || j.jobLocation) : '';
      var salaryObj = j.baseSalary ? j.baseSalary.value : null;
      var salaryVal = salaryObj ? (String(salaryObj.value || salaryObj.amount || '')).replace(/[^0-9.]/g, '') : '';
      result.push({
        title: clean(j.title),
        companyName: clean(company),
        description: clean(j.description),
        location: clean(location),
        jobType: clean(j.employmentType) || clean(j.type),
        sourceUrl: canonical,
        postedDateIsoString: clean(j.datePosted) || postedDate,
        deadlineIsoString: deadline,
        salaryMin: salaryVal ? Number(salaryVal) : undefined,
        salaryMax: salaryVal ? Number(salaryVal) : undefined,
        salaryCurrency: clean(j.baseSalary && j.baseSalary.currency)
      });
    });
  }

  // Strategy 2: Parse visible job blocks from the article body
  if (jobs.length === 0) {
    var $entry = $('.entry-content, .post-content, .the-content, [itemprop="articleBody"], article');
    var $cands = [];
    var jobInd = /position|vacancy|opportunity|job|nafasi|naibu|mkurugenzi|katibu|afisa|sekretari|meneja|rais|director|manager|specialist|officer|assistant|coordinator|consultant|clerk|driver|sales|auditor|accountant|cashier|accounting|finance/i;

    if ($entry.length) {
      var $direct = [];
      $entry.find('> li, ol > li, ul > li, > div.job, > div.position, > div.vacancy, > div.job-listing, > div.job-item').each(function() {
        var $t = $(this);
        if (clean($t.text()).length > 15) $direct.push(this);
      });
      if ($direct.length >= 2) $cands = $direct;
    }

    if (!$cands.length && $entry.length) {
      var headings = $entry.find('h2, h3, h4, h5').filter(function() {
        var t = clean($(this).text());
        return jobInd.test(t) && t.length > 3;
      });
      headings.each(function() {
        var $p = $(this).parent();
        if (!$p.length) $p = $(this).closest('li, div, p, section, article, tr');
        if ($p.length) $cands.push($p[0]);
      });
    }

    if (!$cands.length) {
      var $alt = $('article li, .entry-content li, [class*="-job"], [class*="job-"], [class*="position"], [class*="vacancy"], tr');
      $alt.not('.entry-summary, .entry-meta, .post-info, .related, .author, .comments, .tags').each(function() {
        if (clean($(this).text()).length > 15) $cands.push(this);
      });
    }

    $cands.each(function() {
      var $el = $(this);
      var $h = $el.find('h1, h2, h3, h4, h5, h6, .job-title, .position-title, strong, b');
      var title = text($h.first());
      if (!title || title.length < 3) return;
      if (!jobInd.test(title)) return;

      var company = clean($el.text()).match(/(?:Mwanga Hakika Bank(?: Ltd| Limited)?(?: \(MHB\))?)/i);
      result.push({
        title: title,
        companyName: company ? company[0] : '',
        description: clean($el.text()),
        location: '',
        jobType: '',
        sourceUrl: canonical,
        postedDateIsoString: postedDate,
        deadlineIsoString: deadline
      });
    });
  }

  // Deduplicate results by title
  if (result.length > 1) {
    var unique = [];
    var seen = new Set();
    for (var i = 0; i < result.length; i++) {
      var j = result[i];
      if (!seen.has(j.title)) { seen.add(j.title); unique.push(j); }
    }
    result.length = 0;
    for (var i = 0; i < unique.length; i++) result.push(unique[i]);
  }
})();