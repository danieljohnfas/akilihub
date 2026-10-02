$('body').each(function() {
  var title = $('title').text().trim();
  var description = '';
  var companyName = '';
  var location = '';
  var jobType = '';
  var postedDateIsoString = '';
  var deadlineIsoString = '';
  var sourceUrl = '';
  
  var ogTitle = $('meta[property="og:title"]').attr('content') || '';
  var articlePublished = $('meta[property="article:published_time"]').attr('content') || '';
  var articleSection = $('meta[property="article:section"]').attr('content') || '';
  var canonicalUrl = $('link[rel="canonical"]').attr('href') || '';
  var twitterDescription = $('meta[name="twitter:description"]').attr('content') || '';
  var twitterData1 = $('meta[name="twitter:data1"]').attr('content') || '';
  
  if (title && title.toLowerCase().indexOf('jobs') !== -1) {
    if (ogTitle) {
      var titleMatch = ogTitle.match(/^(.+?)\s*[–—-]\s*(.+?)(?:\s*–|\s*–|\s*,|\s+20\d{2})?$/);
      if (titleMatch) {
        title = titleMatch[1].trim();
      }
    }
    
    var companyMatch = title.match(/at\s+(.+?)(?:\s+february|\s+january|\s+202[0-9]|$)/i);
    if (companyMatch) {
      companyName = companyMatch[1].trim();
    }
    
    var dateMatch = title.match(/(20\d{2})\s*(february|january|feb|jan|march|april|may|june|july|august|september|october|november|december)/i);
    if (dateMatch) {
      var monthMap = {
        'january': '01', 'jan': '01',
        'february': '02', 'feb': '02',
        'march': '03',
        'april': '04',
        'may': '05',
        'june': '06',
        'july': '07',
        'august': '08',
        'september': '09',
        'october': '10',
        'november': '11',
        'december': '12'
      };
      var year = dateMatch[1];
      var month = monthMap[dateMatch[2].toLowerCase()];
      if (month) {
        deadlineIsoString = year + '-' + month + '-01T00:00:00+00:00';
      }
    }
    
    if (articlePublished) {
      postedDateIsoString = articlePublished;
    }
    
    if (canonicalUrl) {
      sourceUrl = canonicalUrl;
    }
    
    if (tgDescription) {
      description = twitterDescription;
    } else if ($('meta[name="description"]').attr('content')) {
      description = $('meta[name="description"]').attr('content');
    }
    
    if (description && description.toLowerCase().indexOf('jobs at') !== -1) {
      result.push({
        title: title,
        companyName: companyName,
        description: description,
        location: location,
        jobType: jobType,
        sourceUrl: sourceUrl,
        postedDateIsoString: postedDateIsoString,
        deadlineIsoString: deadlineIsoString,
        salaryMin: undefined,
        salaryMax: undefined,
        salaryCurrency: undefined
      });
    }
  }
});