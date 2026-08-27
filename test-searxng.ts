import fetch from "node-fetch";

const SEARXNG_INSTANCES = [
  "https://searx.be",
  "https://search.privacyguides.net",
  "https://searxng.world",
  "https://paulgo.io",
  "https://search.sapti.me",
];

async function run() {
  const query = "accounting jobs Dar es Salaam";
  for (const instance of SEARXNG_INSTANCES) {
    console.log(`Trying ${instance}...`);
    try {
      const url = new URL(`${instance}/search`);
      url.searchParams.set("q", query);
      url.searchParams.set("format", "json");
      
      const res = await fetch(url.toString());
      console.log(`HTTP ${res.status}`);
      if (res.ok) {
         const data = await res.json();
         console.log(`Results: ${data?.results?.length}`);
         if (data?.results?.length > 0) return;
      }
    } catch (e) {
      console.error(e.message);
    }
  }
}
run();
