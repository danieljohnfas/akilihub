import fetch from "node-fetch";
import * as cheerio from "cheerio";

async function searchDDGLite(query) {
  const res = await fetch("https://lite.duckduckgo.com/lite/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    body: `q=${encodeURIComponent(query)}`
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  const urls = [];
  $("a.result-url").each((i, el) => {
    let href = $(el).attr("href");
    if (href) urls.push(href);
  });
  console.log("Found:", urls.length);
  console.log(urls.slice(0, 5));
}
searchDDGLite("accounting jobs Dar es Salaam");
