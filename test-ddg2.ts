import fetch from "node-fetch";
import * as cheerio from "cheerio";

async function searchDDGHtml(query) {
  const res = await fetch("https://html.duckduckgo.com/html/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    body: `q=${encodeURIComponent(query)}`
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  const urls = [];
  $("a.result__url").each((i, el) => {
    let href = $(el).attr("href");
    if (href.startsWith("//duckduckgo.com/l/?uddg=")) {
       href = decodeURIComponent(href.replace("//duckduckgo.com/l/?uddg=", "").split("&")[0]);
    }
    urls.push(href);
  });
  console.log("Found:", urls.length);
  console.log(urls.slice(0, 5));
}
searchDDGHtml("accounting jobs Dar es Salaam");
