import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

async function fetchCloudflareData() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) {
    console.error('CLOUDFLARE_API_TOKEN not found in .env.local');
    return;
  }

  // 1. Get Zone ID for akilibrain.com
  console.log('Fetching Zone ID for akilibrain.com...');
  const zoneRes = await fetch('https://api.cloudflare.com/client/v4/zones?name=akilibrain.com', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const zoneData = await zoneRes.json();
  if (!zoneData.success || zoneData.result.length === 0) {
    console.error('Failed to find zone akilibrain.com', zoneData.errors);
    return;
  }

  const zoneId = zoneData.result[0].id;
  console.log(`Found Zone ID: ${zoneId}`);

  // 2. Fetch GraphQL analytics (Try last 30 days as a safe window)
  const query = `
    query {
      viewer {
        zones(filter: { zoneTag: "${zoneId}" }) {
          httpRequests1dGroups(
            limit: 10000,
            filter: { date_geq: "2023-01-01" }
          ) {
            sum {
              requests
              pageViews
              bytes
              threats
              cachedRequests
            }
            dimensions {
              date
            }
          }
        }
      }
    }
  `;

  console.log('Fetching traffic data from Cloudflare GraphQL API...');
  const gqlRes = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });

  const gqlData = await gqlRes.json();
  
  if (gqlData.errors) {
    console.error('GraphQL Errors:', JSON.stringify(gqlData.errors, null, 2));
    
    // Fallback: try just the last 30 days if the full range failed due to limits
    console.log('\nRetrying with a 30-day window...');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateGeq = thirtyDaysAgo.toISOString().split('T')[0];
    
    const fallbackQuery = `
      query {
        viewer {
          zones(filter: { zoneTag: "${zoneId}" }) {
            httpRequests1dGroups(
              limit: 10000,
              filter: { date_geq: "${dateGeq}" }
            ) {
              sum {
                requests
                pageViews
                bytes
                threats
                cachedRequests
              }
            }
          }
        }
      }
    `;
    const fbRes = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: fallbackQuery })
    });
    const fbData = await fbRes.json();
    console.log(JSON.stringify(fbData.data.viewer.zones[0].httpRequests1dGroups, null, 2));
  } else {
    const groups = gqlData.data.viewer.zones[0].httpRequests1dGroups;
    let totalRequests = 0;
    let totalPageViews = 0;
    let totalThreats = 0;
    let totalCached = 0;

    for (const g of groups) {
      totalRequests += g.sum.requests;
      totalPageViews += g.sum.pageViews;
      totalThreats += g.sum.threats;
      totalCached += g.sum.cachedRequests;
    }

    console.log('\n=== CLOUDFLARE TRAFFIC SUMMARY ===');
    console.log(`Days of data retrieved: ${groups.length}`);
    if (groups.length > 0) {
      console.log(`Date range: ${groups[0].dimensions.date} to ${groups[groups.length-1].dimensions.date}`);
    }
    console.log(`Total Requests:  ${totalRequests.toLocaleString()}`);
    console.log(`Total PageViews: ${totalPageViews.toLocaleString()}`);
    console.log(`Total Threats Blocked: ${totalThreats.toLocaleString()}`);
    console.log(`Cached Requests: ${totalCached.toLocaleString()} (${totalRequests > 0 ? ((totalCached/totalRequests)*100).toFixed(1) : 0}%)`);
  }
}

fetchCloudflareData().catch(console.error);
