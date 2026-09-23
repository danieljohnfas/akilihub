async function inspectListingJs() {
  const res = await fetch('https://somalijobs.com/v3/src/editing-js/jobs/listing.js', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' },
  });
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Listing JS length:', text.length);
  // find endpoints
  const matches = text.match(/(?:url|href|get|post)\s*:\s*['"`]([^'"`]+)['"`]/gi);
  console.log('URL matches in JS:', matches?.slice(0, 10));
}

inspectListingJs();
