$( ".post-content" ).find( "p" ).each(function() {
  var jobTitle = $( this ).text().trim();
  if (jobTitle.startsWith("Job Title:") || jobTitle.startsWith("Nafasi ya Kazi:")) {
    var job = {};
    job.title = jobTitle.replace("Job Title: ", "").replace("Nafasi ya Kazi: ", "");
    var companyName = $( this ).next( "p" ).text().trim();
    if (companyName.startsWith("Company:") || companyName.startsWith("Kampuni:")) {
      job.companyName = companyName.replace("Company: ", "").replace("Kampuni: ", "");
    }
    var description = $( this ).nextAll( "p" ).first().text().trim();
    job.description = description;
    var location = $( this ).nextAll( "p" ).eq(1).text().trim();
    if (location.startsWith("Location:") || location.startsWith("Mahali:")) {
      job.location = location.replace("Location: ", "").replace("Mahali: ", "");
    }
    var jobType = $( this ).nextAll( "p" ).eq(2).text().trim();
    if (jobType.startsWith("Job Type