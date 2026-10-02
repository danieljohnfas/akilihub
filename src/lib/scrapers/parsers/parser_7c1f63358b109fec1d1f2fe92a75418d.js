let found = false;
$('script[type="application/ld+json"]').each(function () {
  let txt = $(this).contents().first().text().trim();
  if (!txt) return;
  try {
    let data = JSON.parse(txt);
    let items = Array.isArray(data) ? data : [data];
    items.forEach(function (item) {
      if (item && item["@graph"]) {
        let graph = Array.isArray(item["@graph"]) ? item["@graph"] : [item["@graph"]];
        graph.forEach(processItem);
      } else {
        processItem(item);
      }
    });
  } catch (e) {}
});
function processItem(item) {
  if (!item) return;
  let type = item["@type"];
  if (Array.isArray(type)) {
    if (!type.includes("JobPosting")) return;
  } else if (type !== "JobPosting") {
    return;
  }
  let job = {};
  if (item.title) job.title = item.title.trim();
  if (item.hiringOrganization && item.hiringOrganization.name) job.companyName = item.hiringOrganization.name.trim();
  if (item.description) job.description = item.description.trim();
  if (item.jobLocation) {
    let loc = item.jobLocation;
    if (Array.isArray(loc)) loc = loc[0];
    if (loc && loc.address) {
      let a = loc.address;
      let parts = [];
      if (a.streetAddress) parts.push(a.streetAddress);
      if (a.addressLocality) parts.push(a.addressLocality);
      if (a.addressRegion) parts.push(a.addressRegion);
      if (a.postalCode) parts.push(a.postalCode);
      if (a.addressCountry) parts.push(a.addressCountry);
      if (parts.length) job.location = parts.join(", ");
    }
  }
  if (item.employmentType) {
    let et = item.employmentType;
    if (Array.isArray(et)) et = et[0];
    job.jobType = et.toLowerCase().replace(/ /g, "_");
  }
  if (item.url) job.sourceUrl = item.url.trim();
  if (item.datePosted) job.postedDateIsoString = new Date(item.datePosted).toISOString();
  if (item.validThrough) job.deadlineIsoString = new Date(item.validThrough).toISOString();
  if (item.baseSalary) {
    let sal = item.baseSalary;
    if (sal.value) {
      if (sal.value.minValue !== undefined) job.salaryMin = Number(sal.value.minValue);
      if (sal.value.maxValue !== undefined) job.salaryMax = Number(sal.value.maxValue);
      if (sal.value.currency) job.salaryCurrency = sal.value.currency;
    } else {
      if (sal.minValue !== undefined) job.salaryMin = Number(sal.minValue);
      if (sal.maxValue !== undefined) job.salaryMax = Number(sal.maxValue);
      if (sal.currency) job.salaryCurrency = sal.currency;
    }
  }
  result.push(job);
  found = true;
}
if (!found) {
  // result remains empty
}