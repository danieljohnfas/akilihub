result.push({
  title: $("title").text().split(" - ")[0],
  companyName: $("title").text().split(" - ")[1].split(" – ")[0],
  description: $(".entry-content").text().trim(),
  location: "",
  jobType: "",
  sourceUrl: $("link[rel='canonical']").attr("href"),
  postedDateIsoString: $("script[type='application/ld+json']").text().match(/"datePublished":"(.*?)"/)[1],
  deadlineIsoString: "",
  salaryMin: undefined,
  salaryMax: undefined,
  salaryCurrency: undefined
});