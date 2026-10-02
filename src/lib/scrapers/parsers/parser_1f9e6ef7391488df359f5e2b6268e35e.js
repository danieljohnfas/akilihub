var jobFound = false;
$('script[type="application/ld+json"]').each(function (_, el) {
  var txt = $(el).contents().text().trim();
  if (!txt) return;
  try {
    var data = JSON.parse(txt);
    var items = Array.isArray(data) ? data : [data];
    items.forEach(function (item) {
      if (item && item['@type'] === 'JobPosting') {
        jobFound = true;
        var job = {};
        job.title = item.title || '';
        job.companyName =
          (item.hiringOrganization && item.hiringOrganization.name) || '';
        job.description = item.description || '';
        if (item.jobLocation && item.jobLocation.address) {
          var addr = item.jobLocation.address;
          job.location =
            addr.addressLocality ||
            addr.addressRegion ||
            addr.streetAddress ||
            '';
        }
        var empType = item.employmentType;
        if (Array.isArray(empType)) empType = empType[0];
        if (empType) {
          var map = {
            FULL_TIME: 'full_time',
            PART_TIME: 'part_time',
            CONTRACT: 'contract',
            INTERNSHIP: 'internship',
            REMOTE: 'remote',
          };
          job.jobType = map[empType.toUpperCase()] || '';
        }
        job.sourceUrl = item.url || '';
        if (item.datePosted) {
          job.postedDateIsoString = new Date(item.datePosted).toISOString();
        }
        if (item.validThrough) {
          job.deadlineIsoString = new Date(item.validThrough).toISOString();
        }
        if (item.baseSalary) {
          var salary = item.baseSalary;
          var value = salary.value || salary;
          if (value) {
            job.salaryMin = Number(value.minValue) || null;
            job.salaryMax = Number(value.maxValue) || null;
            job.salaryCurrency = salary.currency || null;
          }
        }
        result.push(job);
      }
    });
  } catch (e) {}
});

if (!jobFound) {
  // No JobPosting detected; result stays empty
}