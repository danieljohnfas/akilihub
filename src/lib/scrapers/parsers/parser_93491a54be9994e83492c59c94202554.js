// Helper to push a job object
function pushJob(job) {
  result.push(job);
}

// Extract jobs from JSON‑LD <script type="application/ld+json">
$('script[type="application/ld+json"]').each(function () {
  const txt = $(this).contents().first().text();
  if (!txt) return;
  let data;
  try {
    data = JSON.parse(txt);
  } catch (e) {
    return;
  }
  const items = Array.isArray(data)
    ? data
    : data["@graph"]
    ? data["@graph"]
    : [data];
  items.forEach(function (item) {
    if (item && item["@type"] === "JobPosting") {
      const job = {
        title: item.title || "",
        companyName:
          (item.hiringOrganization && item.hiringOrganization.name) || "",
        description: item.description || "",
        location:
          (item.jobLocation &&
            item.jobLocation.address &&
            (item.jobLocation.address.addressLocality ||
              item.jobLocation.address.streetAddress)) ||
          "",
        jobType: (function () {
          const t = (item.employmentType || "").toLowerCase();
          if (t.includes("full")) return "full_time";
          if (t.includes("part")) return "part_time";
          if (t.includes("contract")) return "contract";
          if (t.includes("intern")) return "internship";
          if (t.includes("remote")) return "remote";
          return "";
        })(),
        sourceUrl: item.url || "",
        postedDateIsoString: item.datePosted || "",
        deadlineIsoString: item.validThrough || "",
        salaryMin: null,
        salaryMax: null,
        salaryCurrency: null,
      };
      if (item.baseSalary) {
        const sb = item.baseSalary;
        if (sb.value) {
          job.salaryMin = sb.value.minValue != null ? sb.value.minValue : null;
          job.salaryMax = sb.value.maxValue != null ? sb.value.maxValue : null;
          job.salaryCurrency = sb.currency || null;
        }
      }
      if (job.title) pushJob(job);
    }
  });
});

// Fallback: extract jobs from typical DOM containers
const jobContainers = $(
  "article.job, .job-card, .job-item, .job-listing, .listing-item, .card, .list-item, .search-result, .result-item"
);
jobContainers.each(function () {
  const container = $(this);
  const titleEl = container
    .find("h1, h2, h3, .title, a.job-title, a.title")
    .first();
  const title = titleEl.text().trim();
  if (!title) return;

  const company = container.find(".company, .company-name").first().text().trim();
  const location = container
    .find(".location, .job-location")
    .first()
    .text()
    .trim();
  const description = container
    .find(".description, .job-description, p")
    .first()
    .text()
    .trim();

  const typeText = container
    .find(".type, .employment-type")
    .first()
    .text()
    .trim()
    .toLowerCase();
  let jobType = "";
  if (typeText.includes("full")) jobType = "full_time";
  else if (typeText.includes("part")) jobType = "part_time";
  else if (typeText.includes("contract")) jobType = "contract";
  else if (typeText.includes("intern")) jobType = "internship";
  else if (typeText.includes("remote")) jobType = "remote";

  const sourceUrl =
    container.find("a").first().attr("href") && container.find("a").first().attr("href").trim();

  const posted = container
    .find("time[datetime]")
    .first()
    .attr("datetime")
    ? container.find("time[datetime]").first().attr("datetime").trim()
    : "";
  const deadline = container
    .find("time.deadline[datetime]")
    .first()
    .attr("datetime")
    ? container.find("time.deadline[datetime]").first().attr("datetime").trim()
    : "";

  const salaryText = container.find(".salary, .pay").first().text().trim();
  let salaryMin = null,
    salaryMax = null,
    salaryCurrency = null;
  if (salaryText) {
    const m = salaryText.match(
      /([A-Z]{3})?\s*([\d,]+)(?:\s*[-–]\s*([A-Z]{3})?\s*([\d,]+))?/
    );
    if (m) {
      salaryCurrency = m[1] || m[3] || null;
      salaryMin = parseFloat(m[2].replace(/,/g, "")) || null;
      if (m[4]) salaryMax = parseFloat(m[4].replace(/,/g, "")) || null;
    }
  }

  const job = {
    title,
    companyName: company,
    description,
    location,
    jobType,
    sourceUrl: sourceUrl || "",
    postedDateIsoString: posted,
    deadlineIsoString: deadline,
    salaryMin,
    salaryMax,
    salaryCurrency,
  };

  pushJob(job);
});