/**
 * monitor.js — AkiliBrain Comprehensive Ecosystem Monitor
 *
 * Tracks ALL online tools, AI providers, scrapers, databases, and APIs.
 * Runs continuously, every 60 seconds, with:
 *   - Color-coded output (green/yellow/red)
 *   - Incident tracking (counts consecutive failures)
 *   - Cold-start awareness (Render free-tier services)
 *   - Summary dashboard printed every cycle
 *
 * Usage: node --env-file=.env.local monitor.js
 */

const https = require('https');
const http  = require('http');

// ── ANSI Color codes ──────────────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  white:  '\x1b[37m',
  gray:   '\x1b[90m',
  bgRed:  '\x1b[41m',
};

// ── Incident tracker — consecutive failure count per service name ─────────────
const incidents = new Map();  // name → { fails: number, firstFailAt: Date }

// ── HTTP ping helper ──────────────────────────────────────────────────────────
async function ping({ url, method = 'GET', headers = {}, body = null, timeout = 12000 }) {
  const start = Date.now();
  return new Promise((resolve) => {
    const isHttps = url.startsWith('https:');
    const client  = isHttps ? https : http;
    const req = client.request(url, { method, headers, timeout }, (res) => {
      const ms     = Date.now() - start;
      const status = res.statusCode;
      res.on('data', () => {});
      res.on('end', () => resolve({ status, ms, ok: status >= 200 && status < 500 }));
    });
    req.on('timeout', () => { req.destroy(); resolve({ status: 'TIMEOUT', ms: Date.now() - start, ok: false }); });
    req.on('error',   (err) => resolve({ status: 'ERROR',   ms: Date.now() - start, ok: false, msg: err.code || err.message }));
    if (body) req.write(body);
    req.end();
  });
}

const env = process.env;

// ── Service Registry ──────────────────────────────────────────────────────────
// Every online tool, platform, API used by AkiliBrain.
const services = [

  // ── 1. VERCEL — Primary serverless compute ───────────────────────────────────
  { group: 'Vercel',      name: 'Frontend (akilibrain.com)',   url: 'https://akilibrain.com/' },
  { group: 'Vercel',      name: 'Search API',                  url: 'https://akilibrain.com/api/search?q=jobs+kenya' },
  { group: 'Vercel',      name: 'Subscribe API',               url: 'https://akilibrain.com/api/subscribe', method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'monitor@test.com', name: 'Monitor' }) },
  { group: 'Vercel',      name: 'Inngest Webhook',             url: 'https://akilibrain.com/api/inngest' },
  { group: 'Vercel',      name: 'Salaries API',                url: 'https://akilibrain.com/api/salaries/verify?id=test' },

  // ── 2. RENDER — Scraper & auxiliary services (free tier, cold-starts) ────────
  { group: 'Render',      name: 'Scrapling Sidecar',           url: 'https://akilihub-scraper.onrender.com/health',     timeout: 35000, coldStart: true },
  { group: 'Render',      name: 'Crawl4AI',                    url: 'https://akilihub-crawl4ai.onrender.com/',          timeout: 35000, coldStart: true },
  { group: 'Render',      name: 'Langflow',                    url: 'https://akilihub-langflow.onrender.com/health',    timeout: 35000, coldStart: true },
  { group: 'Render',      name: 'Stirling PDF',                url: 'https://akilihub-stirling-pdf.onrender.com/',      timeout: 35000, coldStart: true },

  // ── 3. SUPABASE — Postgres database ─────────────────────────────────────────
  { group: 'Supabase',    name: 'Postgres REST API',
    url: `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`,
    headers: { 'apikey': env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '' } },
  { group: 'Supabase',    name: 'Auth Service',
    url: `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`,
    headers: { 'apikey': env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '' } },

  // ── 4. INNGEST — Background job orchestration ─────────────────────────────
  { group: 'Inngest',     name: 'Event API',                   url: 'https://api.inngest.com/v1/events', method: 'POST' },
  { group: 'Inngest',     name: 'App Dashboard',               url: 'https://app.inngest.com' },

  // ── 5. RESEND — Email delivery ────────────────────────────────────────────
  { group: 'Resend',      name: 'Email API',
    url: 'https://api.resend.com/emails',
    headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}` } },

  // ── 6. SEARCH ENGINES ────────────────────────────────────────────────────
  { group: 'Search',      name: 'Serper.dev (Google)',
    url: 'https://google.serper.dev/search',
    method: 'POST',
    headers: { 'X-API-KEY': env.SERPER_API_KEY || '', 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: 'jobs Kenya 2026', num: 1 }) },
  { group: 'Search',      name: 'DuckDuckGo (DDGS)',           url: 'https://html.duckduckgo.com/html/?q=test' },
  { group: 'Search',      name: 'Firecrawl',
    url: 'https://api.firecrawl.dev/v1/scrape',
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.FIRECRAWL_API_KEY || ''}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.com', formats: ['markdown'] }) },

  // ── 7. AI MODEL PROVIDERS ─────────────────────────────────────────────────
  { group: 'AI Models',   name: 'Groq (Llama 3.3 70B)',
    url: 'https://api.groq.com/openai/v1/models',
    headers: { 'Authorization': `Bearer ${env.GROQ_API_KEY}` } },
  { group: 'AI Models',   name: 'Gemini (2.5 Flash)',
    url: `https://generativelanguage.googleapis.com/v1beta/models?key=${env.GOOGLE_GENERATIVE_AI_API_KEY}` },
  { group: 'AI Models',   name: 'Cerebras (Llama 3.3 70B)',
    url: 'https://api.cerebras.ai/v1/models',
    headers: { 'Authorization': `Bearer ${env.CEREBRAS_API_KEY}` } },
  { group: 'AI Models',   name: 'SambaNova (Llama 3.3 70B)',
    url: 'https://api.sambanova.ai/v1/models',
    headers: { 'Authorization': `Bearer ${env.SAMBANOVA_API_KEY}` } },
  { group: 'AI Models',   name: 'OpenRouter (20+ models)',
    url: 'https://openrouter.ai/api/v1/models',
    headers: { 'Authorization': `Bearer ${env.OPENROUTER_API_KEY}` } },
  { group: 'AI Models',   name: 'DeepSeek V3',
    url: 'https://api.deepseek.com/v1/models',
    headers: { 'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}` } },
  { group: 'AI Models',   name: 'HuggingFace Router',
    url: 'https://router.huggingface.co/v1/models',
    headers: { 'Authorization': `Bearer ${env.HUGGINGFACE_API_KEY}` } },
  { group: 'AI Models',   name: 'Cohere (Command R+)',
    url: 'https://api.cohere.com/v2/models',
    headers: { 'Authorization': `Bearer ${env.COHERE_API_KEY}` } },
  { group: 'AI Models',   name: 'Mistral',
    url: 'https://api.mistral.ai/v1/models',
    headers: { 'Authorization': `Bearer ${env.MISTRAL_API_KEY}` } },
  { group: 'AI Models',   name: 'Hyperbolic',
    url: 'https://api.hyperbolic.xyz/v1/models',
    headers: { 'Authorization': `Bearer ${env.HYPERBOLIC_API_KEY}` } },
  { group: 'AI Models',   name: 'MiniMax',
    url: 'https://api.minimaxi.chat/v1/models',
    headers: { 'Authorization': `Bearer ${env.MINIMAX_API_KEY}` } },
  { group: 'AI Models',   name: 'Cloudflare Workers AI',
    url: `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/models/search`,
    headers: { 'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}` } },

  // ── 8. GITHUB — Code hosting + CI/CD ─────────────────────────────────────
  { group: 'GitHub',      name: 'GitHub API',                  url: 'https://api.github.com' },
  { group: 'GitHub',      name: 'Repo: danieljohnfas/akilihub',url: 'https://github.com/danieljohnfas/akilihub' },

  // ── 9. CDN & ASSETS ──────────────────────────────────────────────────────
  { group: 'CDN',         name: 'Google Fonts',                url: 'https://fonts.googleapis.com' },

];

// ── Helpers ───────────────────────────────────────────────────────────────────
function ts() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function colorStatus(ok, coldStart, status, ms) {
  if (ok) {
    const latencyColor = ms > 5000 ? C.yellow : C.green;
    return `${C.green}✅${C.reset} [${C.bold}${status}${C.reset}]`;
  }
  if (coldStart && status === 'TIMEOUT') {
    return `${C.yellow}⏳${C.reset} [${C.bold}${C.yellow}COLD${C.reset} ]`;
  }
  return `${C.red}❌${C.reset} [${C.bold}${C.red}${String(status).padEnd(3)}${C.reset}  ]`;
}

function latencyColor(ms, ok) {
  if (!ok) return C.red;
  if (ms > 8000) return C.red;
  if (ms > 3000) return C.yellow;
  return C.green;
}

function updateIncident(name, ok) {
  if (!ok) {
    const inc = incidents.get(name) || { fails: 0, firstFailAt: new Date() };
    inc.fails++;
    incidents.set(name, inc);
  } else {
    incidents.delete(name);
  }
}

// ── Main loop ─────────────────────────────────────────────────────────────────
let cycleCount = 0;

async function runMonitorCycle() {
  cycleCount++;
  const groups = [...new Set(services.map(s => s.group))];

  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}  AkiliBrain Monitor  —  Cycle #${String(cycleCount).padStart(4,'0')}  —  ${ts()}${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════════════════════╝${C.reset}`);

  let totalServices = 0;
  let totalUp       = 0;
  let totalDown     = 0;
  let coldStarts    = 0;

  for (const group of groups) {
    const groupServices = services.filter(s => s.group === group);

    // Ping all in parallel per group
    const results = await Promise.all(
      groupServices.map(async (ep) => {
        const res = await ping({ ...ep, timeout: ep.timeout || 12000 });
        return { ...ep, res };
      })
    );

    console.log(`\n  ${C.bold}${C.white}── ${group.toUpperCase()} ──${C.reset}`);

    for (const { name, coldStart, res } of results) {
      totalServices++;
      updateIncident(name, res.ok);

      const isColdStart = coldStart && res.status === 'TIMEOUT';
      if (res.ok)        totalUp++;
      else if (isColdStart) { coldStarts++; totalUp++; } // cold-start ≠ real failure
      else               totalDown++;

      const inc = incidents.get(name);
      const incStr = inc && inc.fails > 1
        ? ` ${C.red}[INCIDENT: ${inc.fails} consecutive failures since ${inc.firstFailAt.toISOString().slice(11,19)}]${C.reset}`
        : '';

      const statusIcon  = colorStatus(res.ok, coldStart, res.status, res.ms);
      const latStr      = `${latencyColor(res.ms, res.ok || isColdStart)}${res.ms}ms${C.reset}`;
      const msgStr      = res.msg ? ` ${C.gray}(${res.msg})${C.reset}` : '';
      const nameStr     = (res.ok || isColdStart) ? name : `${C.red}${name}${C.reset}`;

      console.log(`    ${statusIcon} ${latStr.padEnd(14)} ${nameStr}${msgStr}${incStr}`);
    }
  }

  // ── Summary dashboard ───────────────────────────────────────────────────
  const downReal    = totalDown;
  const summaryColor = downReal === 0 ? C.green : downReal <= 2 ? C.yellow : C.red;
  const summaryIcon  = downReal === 0 ? '🟢' : downReal <= 2 ? '🟡' : '🔴';

  console.log(`\n  ${C.bold}${C.cyan}── SUMMARY ──${C.reset}`);
  console.log(`    ${summaryIcon}  Up: ${C.green}${C.bold}${totalUp - coldStarts}${C.reset}  Cold: ${C.yellow}${coldStarts}${C.reset}  Down: ${summaryColor}${C.bold}${downReal}${C.reset}  Total: ${totalServices}`);

  if (downReal > 0) {
    const downList = [...incidents.entries()].filter(([,v]) => v.fails >= 1).map(([n]) => n).join(', ');
    console.log(`    ${C.red}⚠  Degraded: ${downList}${C.reset}`);
  }

  // Alert on persistent incidents (3+ consecutive fails)
  for (const [name, inc] of incidents.entries()) {
    if (inc.fails === 3) {
      console.log(`\n  ${C.bgRed}${C.bold} 🚨 ALERT: "${name}" has failed ${inc.fails} times in a row! ${C.reset}`);
    }
  }

  const nextIn = 60;
  console.log(`\n  ${C.gray}Next check in ${nextIn}s...  (Press Ctrl+C to stop)${C.reset}`);
}

async function main() {
  console.log(`${C.bold}${C.cyan}`);
  console.log(`  █████╗ ██╗  ██╗██╗██╗     ██╗██████╗ ██████╗  █████╗ ██╗███╗   ██╗`);
  console.log(`  ██╔══██╗██║ ██╔╝██║██║     ██║██╔══██╗██╔══██╗██╔══██╗██║████╗  ██║`);
  console.log(`  ███████║█████╔╝ ██║██║     ██║██████╔╝██████╔╝███████║██║██╔██╗ ██║`);
  console.log(`  ██╔══██║██╔═██╗ ██║██║     ██║██╔══██╗██╔══██╗██╔══██║██║██║╚██╗██║`);
  console.log(`  ██║  ██║██║  ██╗██║███████╗██║██████╔╝██║  ██║██║  ██║██║██║ ╚████║`);
  console.log(`  ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚══════╝╚═╝╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝`);
  console.log(`${C.reset}`);
  console.log(`  ${C.bold}Ecosystem Monitor${C.reset} — ${services.length} services across ${[...new Set(services.map(s=>s.group))].length} platforms`);
  console.log(`  ${C.gray}Vercel · Render · Supabase · Inngest · Resend · Serper · Firecrawl · 11 AI Models · GitHub${C.reset}`);
  console.log(`  ${C.gray}Polling every 60 seconds. Cold-start-aware. Incident tracking enabled.${C.reset}\n`);

  // Run first cycle immediately
  await runMonitorCycle();

  // Then loop forever
  while (true) {
    await new Promise(r => setTimeout(r, 60000));
    await runMonitorCycle();
  }
}

main().catch(err => {
  console.error(`${C.red}Monitor crashed:${C.reset}`, err);
  process.exit(1);
});
