import * as cheerio from 'cheerio';

async function inspectETDetail() {
  const url = 'https://jobwebethiopia.com/jobs/accountant-dega-group-trading-plc/';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  };
  const res = await fetch(url, { headers });
  const html = await res.text();
  const $ = cheerio.load(html);

  // Find all divs with large text
  $('div').each((i, el) => {
    const text = $(el).clone().children().remove().end().text().trim();
    const className = $(el).attr('class');
    const id = $(el).attr('id');
    if ($(el).text().length > 300 && $(el).text().length < 5000) {
      console.log(`Div class="${className}" id="${id}" -> length ${$(el).text().length}`);
    }
  });
}

inspectETDetail();
