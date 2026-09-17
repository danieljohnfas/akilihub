import postgres from 'postgres';
import { config } from 'dotenv';
config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL! + '?sslmode=require', { max: 1 });

async function seedVibeCodingGuide() {
  console.log('Seeding Vibe Coding Guide...');
  
  const contentHtml = `
    <article class="prose prose-lg dark:prose-invert max-w-none">
      <h2>The Rise of Vibe Coding in Africa</h2>
      <p>SaaS subscriptions like Notion, Canva, or basic CRM tools are often priced in USD, making them incredibly expensive for growing SMEs in Kenya, Tanzania, and Uganda due to exchange rates.</p>
      <p>Enter <strong>Vibe Coding</strong>. Using AI agents like Claude Code, Cursor, or ChatGPT, you can generate your own local versions of these tools by simply describing them in natural language. A recent directory, <em>canivibecodeit.com</em>, tracks over 1,000 apps that can be replicated in a single weekend.</p>
      
      <h3>Why Pay $500/month?</h3>
      <p>If you run a logistics company in Nairobi and need a custom dashboard to track shipments, you don't need a $10k development agency or a $200/mo SaaS subscription anymore. You can literally prompt an AI:</p>
      <blockquote>"Build me a shipment tracking dashboard in Next.js. Use Tailwind for styling. Connect it to a Supabase database."</blockquote>
      
      <h3>The Moat: What Can't Be Cloned?</h3>
      <p>While UIs and basic logic are easily generated, <strong>Proprietary Data</strong> and <strong>Network Effects</strong> remain impossible to vibe-code. Platforms like AkiliHub rely on exclusive data pipelines and real human connections, making them highly defensible businesses. If you are a founder, focus on gathering local data and integrating deeply into local systems (like M-Pesa), and let AI write the boilerplate.</p>
    </article>
  `;

  await sql`
    INSERT INTO guides (
      slug, title, summary, content_html, category, trend_topic, reading_time_minutes, is_published, view_count
    ) VALUES (
      'vibe-coding-sme-saas-savings',
      'The Vibe Coding Guide for African Startups: Replacing Expensive SaaS',
      'Learn how African SMEs can use AI vibe-coding to generate their own internal tools and bypass expensive USD software subscriptions.',
      ${contentHtml},
      'general',
      'Vibe Coding & AI',
      4,
      true,
      0
    ) ON CONFLICT (slug) DO UPDATE SET 
      title = EXCLUDED.title,
      summary = EXCLUDED.summary,
      content_html = EXCLUDED.content_html;
  `;
  
  console.log('✅ Guide seeded successfully.');
  process.exit(0);
}

seedVibeCodingGuide().catch(console.error);
