const https = require('https');
const http = require('http');

// Helper to quickly ping an endpoint with headers
async function ping({ url, method = 'GET', headers = {}, body = null, timeout = 10000 }) {
  const start = Date.now();
  return new Promise((resolve) => {
    const isHttps = url.startsWith('https:');
    const client = isHttps ? https : http;
    const req = client.request(url, { method, headers, timeout }, (res) => {
      const ms = Date.now() - start;
      const status = res.statusCode;
      // We consume data so the socket can be reused/closed
      res.on('data', () => {});
      res.on('end', () => resolve({ status, ms, ok: status >= 200 && status < 500 })); // 4xx is still "platform up"
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 'TIMEOUT', ms: Date.now() - start, ok: false });
    });
    
    req.on('error', (err) => {
      resolve({ status: 'ERROR', ms: Date.now() - start, ok: false, msg: err.message });
    });

    if (body) req.write(body);
    req.end();
  });
}

const env = process.env;

const services = [
  // 1. Core Vercel Platform
  { group: 'Vercel', name: 'Frontend App', url: 'https://akilibrain.com/' },
  { group: 'Vercel', name: 'Search API', url: 'https://akilibrain.com/api/search?q=test' },
  { group: 'Vercel', name: 'Inngest Trigger', url: 'https://akilibrain.com/api/inngest' },
  
  // 2. Render Cloud Run Services
  { group: 'Render', name: 'Scraper Sidecar', url: 'https://akilihub-scraper.onrender.com/health' },
  { group: 'Render', name: 'Crawl4AI', url: 'https://akilihub-crawl4ai.onrender.com/' },
  { group: 'Render', name: 'Langflow', url: 'https://akilihub-langflow.onrender.com/health' },
  { group: 'Render', name: 'Stirling PDF', url: 'https://akilihub-stirling-pdf.onrender.com/' },

  // 3. 3rd Party Managed Services
  { group: 'Supabase', name: 'Postgres REST API', url: env.NEXT_PUBLIC_SUPABASE_URL ? `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/` : 'https://supabase.com', headers: env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? { 'apikey': env.NEXT_PUBLIC_SUPABASE_ANON_KEY } : {} },
  { group: 'Inngest', name: 'Event API', url: 'https://api.inngest.com/v1/events', method: 'POST' },
  { group: 'Resend', name: 'Email API', url: 'https://api.resend.com/emails', headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}` } },
  { group: 'DuckDuckGo', name: 'Search Check', url: 'https://html.duckduckgo.com/html/?q=test' },

  // 4. AI Provider APIs
  { group: 'AI Model', name: 'Groq', url: 'https://api.groq.com/openai/v1/models', headers: { 'Authorization': `Bearer ${env.GROQ_API_KEY}` } },
  { group: 'AI Model', name: 'Mistral', url: 'https://api.mistral.ai/v1/models', headers: { 'Authorization': `Bearer ${env.MISTRAL_API_KEY}` } },
  { group: 'AI Model', name: 'Gemini', url: `https://generativelanguage.googleapis.com/v1beta/models?key=${env.GOOGLE_GENERATIVE_AI_API_KEY}` },
  { group: 'AI Model', name: 'Cerebras', url: 'https://api.cerebras.ai/v1/models', headers: { 'Authorization': `Bearer ${env.CEREBRAS_API_KEY}` } },
  { group: 'AI Model', name: 'SambaNova', url: 'https://api.sambanova.ai/v1/models', headers: { 'Authorization': `Bearer ${env.SAMBANOVA_API_KEY}` } },
  { group: 'AI Model', name: 'OpenRouter', url: 'https://openrouter.ai/api/v1/models', headers: { 'Authorization': `Bearer ${env.OPENROUTER_API_KEY}` } },
  { group: 'AI Model', name: 'DeepSeek', url: 'https://api.deepseek.com/v1/models', headers: { 'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}` } },
  { group: 'AI Model', name: 'HuggingFace', url: 'https://router.huggingface.co/v1/models', headers: { 'Authorization': `Bearer ${env.HUGGINGFACE_API_KEY}` } },
  { group: 'AI Model', name: 'Cohere', url: 'https://api.cohere.com/v2/models', headers: { 'Authorization': `Bearer ${env.COHERE_API_KEY}` } },
];

function getTimestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

async function monitor() {
  console.log(`[${getTimestamp()}] 🚀 Starting comprehensive monitoring...`);
  console.log(`Tracking ${services.length} endpoints across Vercel, Render, Supabase, Inngest, and AI partners.`);
  
  while (true) {
    const time = getTimestamp();
    console.log(`\n================== [ ${time} ] ==================`);
    
    // Group endpoints by category for cleaner output
    const groups = [...new Set(services.map(s => s.group))];
    
    for (const group of groups) {
      console.log(`\n--- ${group.toUpperCase()} ---`);
      const groupServices = services.filter(s => s.group === group);
      
      const results = await Promise.all(groupServices.map(async (ep) => {
        const res = await ping(ep);
        return { ...ep, res };
      }));
      
      for (const { name, res } of results) {
        // Anything under 500 is technically "the service platform is up and responding".
        // A 401 Unauthorized just means the service is alive but rejected the stub request.
        const icon = res.ok ? '✅' : '❌';
        const statusStr = res.status.toString().padEnd(7, ' ');
        const latencyStr = `${res.ms}ms`.padEnd(6, ' ');
        const msg = res.msg ? ` (${res.msg})` : '';
        console.log(`  ${icon} [${statusStr}] ${latencyStr} | ${name}${msg}`);
      }
    }
    
    console.log(`\nWaiting 45 seconds...`);
    await new Promise(r => setTimeout(r, 45000));
  }
}

monitor();
