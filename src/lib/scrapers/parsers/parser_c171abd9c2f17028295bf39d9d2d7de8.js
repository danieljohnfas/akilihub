(function(){
  var jobListFound = false;
  $('script[type="application/ld+json"]').each(function(i, el){
    var data;
    try{
      data = JSON.parse($(el).html());
    }catch(e){
      return;
    }
    var items = Array.isArray(data) ? data : (data['@graph'] || []);
    items.forEach(function(node){
      if(node['@type']==='ItemList' && node.itemListElement){
        jobListFound = true;
        node.itemListElement.forEach(function(listItem){
          if(listItem['@type']==='ListItem'){
            var job = {
              title: listItem.name || '',
              sourceUrl: listItem.url || '',
              companyName: '',
              description: '',
              location: '',
              jobType: '',
              postedDateIsoString: '',
              deadlineIsoString: '',
              salaryMin: null,
              salaryMax: null,
              salaryCurrency: ''
            };
            result.push(job);
          }
        });
      }
    });
  });
  if(!jobListFound){
    $('.job-card, .job-item').each(function(i, el){
      var $el = $(el);
      var title = $el.find('.title, .job-title').first().text().trim();
      var sourceUrl = $el.find('a').attr('href') || '';
      if(!title || !sourceUrl) return;
      var job = {
        title: title,
        sourceUrl: sourceUrl,
        companyName: $el.find('.company, .company-name').text().trim(),
        description: $el.find('.description, .summary').text().trim(),
        location: $el.find('.location').text().trim(),
        jobType: $el.find('.job-type').text().trim().toLowerCase(),
        postedDateIsoString: $el.find('time[datetime]').attr('datetime') || '',
        deadlineIsoString: '',
        salaryMin: null,
        salaryMax: null,
        salaryCurrency: ''
      };
      var allowed = ['full_time','part_time','contract','internship','remote'];
      if(allowed.indexOf(job.jobType) === -1){
        job.jobType = '';
      }
      result.push(job);
    });
  }
})();