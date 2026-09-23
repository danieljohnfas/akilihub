async function inspectOneAcreFund() {
  const url = 'https://boards-api.greenhouse.io/v1/boards/oneacrefund/jobs?content=true';
  const res = await fetch(url);
  const data = await res.json();
  console.log(`Total jobs: ${data.jobs?.length}`);
  for (const j of (data.jobs || []).slice(0, 5)) {
    console.log(`- ${j.title} | ${j.location?.name} | content len: ${j.content?.length}`);
    console.log(`  URL: ${j.absolute_url}`);
  }
}

inspectOneAcreFund();
