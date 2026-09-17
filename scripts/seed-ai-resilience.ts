import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/lib/db/schema/professions';
import { config } from 'dotenv';
config({ path: '.env.local' });

// Bypass pooler for DDL/Seeding operations
const client = postgres(process.env.DATABASE_URL! + '?sslmode=require', { max: 1 });
const db = drizzle(client, { schema });

async function seedProfessions() {
  console.log('Seeding AI Resilience data for professions...');

  const initialData = [
    {
      name: 'Software Engineer',
      automationRiskScore: '3.10',
      resilienceRationale: 'While AI can write boilerplate and assist in debugging, systems architecture, requirement gathering, and cross-team communication remain highly human-dependent.',
      upskillingAdvice: 'Focus on System Design, Cloud Architecture, and Product Management to move up the value chain where AI acts only as an assistant.',
      founderOpportunity: 'Build domain-specific code reviewers or specialized AI-agents for legacy codebases (like COBOL/Fortran) where AI struggles without deep context.',
    },
    {
      name: 'Customer Service Representative',
      automationRiskScore: '8.40',
      resilienceRationale: 'High automation risk. Most Tier 1 and Tier 2 support can be fully resolved by context-aware LLMs using RAG.',
      upskillingAdvice: 'Transition into Customer Success Management, Account Management, or Technical Escalation roles where human empathy, relationship building, and high-stakes negotiation are required.',
      founderOpportunity: 'Deploy localized AI voice agents for African languages (Swahili, Amharic) where Western models lack nuance and accent comprehension.',
    },
    {
      name: 'Data Labeler (Task Economy)',
      automationRiskScore: '1.20',
      resilienceRationale: 'Extremely resilient in the short-to-medium term. AI models require continuous human-in-the-loop (RLHF) training to improve, creating a massive demand for domain experts.',
      upskillingAdvice: 'Specialize in complex reasoning tasks (e.g., math, legal, medical labeling) rather than simple image categorization.',
      founderOpportunity: 'Start an African-based data labeling agency. The cost of living arbitrage combined with high English proficiency makes this a billion-dollar market gap for model training.',
    },
    {
      name: 'Field Operations Manager',
      automationRiskScore: '2.00',
      resilienceRationale: 'Requires physical presence, local cultural context, logistics handling, and spontaneous problem-solving in the physical world.',
      upskillingAdvice: 'Learn to use AI logistical tools and IoT sensors to manage fleets and supply chains more effectively.',
      founderOpportunity: 'Create AI-driven routing and supply chain predictive tools tailored to African infrastructure challenges.',
    },
    {
      name: 'Medical Officer',
      automationRiskScore: '2.80',
      resilienceRationale: 'AI can assist in diagnosis, but patient trust, physical examinations, and liability/regulatory frameworks require human doctors.',
      upskillingAdvice: 'Integrate AI diagnostic assistants into your workflow to increase patient throughput and accuracy.',
      founderOpportunity: 'Develop AI telemedicine triage systems that understand local colloquialisms for symptoms and map to endemic diseases.',
    }
  ];

  for (const prof of initialData) {
    await db.insert(schema.professions)
      .values(prof)
      .onConflictDoUpdate({
        target: schema.professions.name,
        set: prof
      });
  }

  console.log('✅ Seeded professions successfully.');
  process.exit(0);
}

seedProfessions().catch((err) => {
  console.error('Error seeding professions:', err);
  process.exit(1);
});
