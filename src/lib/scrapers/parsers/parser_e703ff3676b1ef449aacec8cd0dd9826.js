(function() {
  var jobs = [];
  var $main = $('article').first();
  if (!$main.length) {
    var $content = $('div.entry-content, section, div.post, .job-card').first();
    if ($content.length) { $main = $content.closest('article, section, div, body').first(); }
    else { $main = $('body'); }
  }
  var $title = $main.find('h1, h1.entry-title, .entry-title').first();
  var title = $title.length ? $title.text() : '';
  if (title && title.length > 2) {
    var parts = title.split(' – ').map(function(t) { return t.trim(); });
    var cleanTitle = parts.shift();
    var companyName = parts.length > 0 ? parts.shift() : '';
    if (cleanTitle && cleanTitle !== 'Nafasi za kazi' && cleanTitle.length > 1) {
      var $desc = $main.find('div.entry-content, .entry-content, .post-content, .the-content').first();
      var description = $desc.length ? $desc.text() : $main.text();
      description = description.replace(/\s+/g, ' ').trim();
      if (description.length > 10) {
        var job = { title: cleanTitle };
        if (companyName) job.companyName = companyName;
        if (description) job.description = description;
        var canonical = $('link[rel="canonical"]').attr('href');
        if (canonical) job.sourceUrl = canonical;
        var metaDate = $('meta[property="article:published_time"]').attr('content');
        var timeAttr = $main.find('time').attr('datetime') || $main.find('meta[name="date"]').attr('content');
        if (metaDate) job.postedDateIsoString = metaDate;
        else if (timeAttr) job.postedDateIsoString = timeAttr;
        var dateEl = $main.find('time').first();
        if (dateEl.length && !job.postedDateIsoString) {
          job.postedDateIsoString = dateEl.attr('datetime');
        }
        if (job.postedDateIsoString) {
          try {
            var d = new Date(job.postedDateIsoString);
            if (!isNaN(d.getTime())) {
              job.postedDateIsoString = d.toISOString();
            }
          } catch (e) {}
        }
        jobs.push(job);
      }
    }
  }
  jobs.forEach(function(job) {
    result.push(job);
  });
})();