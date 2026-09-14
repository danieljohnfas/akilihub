import * as cheerio from 'cheerio';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { generateTextWithFallback } from '../ai/router';
import * as vm from 'vm';

const PARSERS_DIR = path.join(process.cwd(), 'src', 'lib', 'scrapers', 'parsers');

if (!fs.existsSync(PARSERS_DIR)) {
  fs.mkdirSync(PARSERS_DIR, { recursive: true });
}

export function getStructuralFingerprint(html: string): string {
  const $ = cheerio.load(html);
  $('script, style, svg, iframe, noscript').remove();
  
  $('*').contents().filter(function() {
    return this.type === 'text' || this.type === 'comment';
  }).remove();

  $('*').each(function() {
    const el = this as any;
    if (el.attribs) {
      const cls = el.attribs['class'];
      const id = el.attribs['id'];
      el.attribs = {};
      if (cls) el.attribs['class'] = cls;
      if (id) el.attribs['id'] = id;
    }
  });

  return crypto.createHash('md5').update($.html()).digest('hex');
}

export async function executeParser(hash: string, html: string): Promise<any[]> {
  const scriptPath = path.join(PARSERS_DIR, `parser_${hash}.js`);
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Parser not found for hash ${hash}`);
  }
  
  const scriptContent = fs.readFileSync(scriptPath, 'utf8');
  
  const sandbox = {
    html: html,
    cheerio: cheerio,
    result: [] as any[]
  };
  
  const context = vm.createContext(sandbox);
  const script = new vm.Script(`const $ = cheerio.load(html);\n${scriptContent}`);
  script.runInContext(context);
  return sandbox.result;
}

export async function generateParserWithAI(hash: string, html: string, previousError?: string): Promise<void> {
  const sampleHtml = html.length > 25000 ? html.slice(0, 25000) : html;
  const prompt = `You are an expert Node.js scraper. Write a deterministic Cheerio script to extract jobs from this specific HTML structure.

The script will be executed in a Node.js VM context where the following variables are already available:
- html: a string containing the raw HTML
- $: a cheerio instance pre-loaded with the html (cheerio.load(html))
- result: an empty array that you MUST populate with the extracted job objects.

${previousError ? `PREVIOUS ERROR FIXING:\nThe previous script failed with this error: ${previousError}\nPlease rewrite the script to handle this edge case gracefully.\n\n` : ''}
Your script must extract an array of job objects and push them to the result array.
If there are multiple jobs on the page, loop over their containers.
Each job object should ideally have these keys (if available in the HTML):
- title (string)
- companyName (string)
- description (string)
- location (string)
- jobType (string: full_time, part_time, contract, internship, remote)
- sourceUrl (string)
- postedDateIsoString (string)
- deadlineIsoString (string)
- salaryMin (number)
- salaryMax (number)
- salaryCurrency (string)

Return ONLY valid javascript code. Do not include markdown formatting like \`\`\`javascript or \`\`\`. Do not include comments that might break syntax. Just the raw JS statements.

HTML SAMPLE:
${sampleHtml}`;

  const { text } = await generateTextWithFallback({
    prompt,
    maxTokens: 3000,
  }) as { text: string };

  let cleanCode = text.trim();
  if (cleanCode.startsWith('```javascript')) {
    cleanCode = cleanCode.replace(/^```javascript/, '').replace(/```$/, '').trim();
  } else if (cleanCode.startsWith('```')) {
    cleanCode = cleanCode.replace(/^```(js|javascript)?/, '').replace(/```$/, '').trim();
  }

  const scriptPath = path.join(PARSERS_DIR, `parser_${hash}.js`);
  fs.writeFileSync(scriptPath, cleanCode, 'utf8');
  console.log(`[DOM Cluster] Generated and saved new parser for hash ${hash}`);
}
