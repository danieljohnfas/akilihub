async function testReliefWeb() {
  const countries = ['Burundi', 'Somalia', 'Democratic Republic of the Congo', 'Rwanda', 'South Sudan'];
  for (const c of countries) {
    try {
      const url = `https://api.reliefweb.int/v1/jobs?appname=akilihub&filter[field]=country.exact&filter[value]=${encodeURIComponent(c)}&limit=10&profile=full`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      console.log(`ReliefWeb for ${c}: HTTP ${res.status}`);
      if (res.ok) {
        const json = await res.json();
        console.log(`  Total in ReliefWeb: ${json.totalCount}`);
        if (json.data && json.data.length > 0) {
          const sample = json.data[0];
          console.log(`  Sample title: ${sample.fields?.title}`);
          console.log(`  Sample source/employer: ${sample.fields?.source?.map(s => s.name).join(', ')}`);
          console.log(`  Sample body length: ${sample.fields?.body?.length}`);
        }
      }
    } catch (e) {
      console.log(`  Error for ${c}: ${e.message}`);
    }
  }
}

testReliefWeb();
