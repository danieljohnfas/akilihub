import { search } from "duck-duck-scrape";

async function run() {
  const searchResults = await search("accounting jobs Dar es Salaam", {
    safeSearch: "off"
  });
  console.log("Found:", searchResults.results.length);
  console.log(searchResults.results.slice(0, 5).map(r => r.url));
}
run();
