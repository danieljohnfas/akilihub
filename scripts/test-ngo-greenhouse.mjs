async function testNgoGreenhouse() {
  const boards = [
    'evidenceaction',
    'livinggoods',
    'bridgeinternationalacademies',
    'africanleadershipgroup',
    'alx',
    'teachforall',
    'instiglio',
    'babbel',
    'burnmanufacturing',
    'copiaglobal',
    'victoryfarms',
    'komaza'
  ];

  for (const b of boards) {
    try {
      const url = `https://boards-api.greenhouse.io/v1/boards/${b}/jobs?content=true`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const data = await res.json();
        const jobs = data.jobs || [];
        console.log(`✅ Greenhouse "${b}": ${jobs.length} total vacancies`);
        if (jobs.length > 0) {
          const sample = jobs.slice(0, 2).map(j => ({
            title: j.title,
            location: j.location?.name,
            url: j.absolute_url
          }));
          console.log('   Sample:', JSON.stringify(sample));
        }
      } else {
        console.log(`❌ Greenhouse "${b}": Status ${res.status}`);
      }
    } catch (e) {
      console.log(`⚠️ Greenhouse "${b}": ${e.message}`);
    }
  }
}

testNgoGreenhouse();
