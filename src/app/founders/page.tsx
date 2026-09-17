import { db } from '@/lib/db/client';
import { professions } from '@/lib/db/schema/professions';
import { asc } from 'drizzle-orm';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BrainCircuit, LineChart, Target } from 'lucide-react';

export default async function FoundersPage() {
  // Fetch professions ordered by lowest automation risk (highest human need)
  const gaps = await db.select().from(professions).orderBy(asc(professions.automationRiskScore));

  return (
    <div className="container mx-auto py-12 px-4 max-w-6xl">
      <div className="flex flex-col items-start gap-4 mb-12">
        <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
          <Target className="w-4 h-4 mr-2" /> Founder Intelligence
        </Badge>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">The AI Treasure Map</h1>
        <p className="text-xl text-muted-foreground max-w-3xl">
          Where is the African Task Economy headed? We map empirical AI benchmark data against local job sectors 
          to reveal where AI models have critical blind spots. Every gap is a billion-dollar business opportunity 
          for local founders and B2B services.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
        <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <BrainCircuit className="w-6 h-6 text-primary" />
              The Task Economy
            </CardTitle>
          </CardHeader>
          <CardContent>
            AI models require continuous RLHF (Reinforcement Learning from Human Feedback). 
            Founders building local data-labeling and domain-expert training hubs have a massive arbitrage opportunity.
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <LineChart className="w-6 h-6" />
              B2B Automation
            </CardTitle>
          </CardHeader>
          <CardContent>
            High-risk jobs can be entirely automated. The opportunity here is building vertical SaaS products that replace these roles entirely with AI agents tailored for African SMEs.
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-500/10 to-transparent border-indigo-500/20">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2 text-indigo-500">
              <BrainCircuit className="w-6 h-6" />
              Defensibility Moats
            </CardTitle>
          </CardHeader>
          <CardContent>
            With the rise of "vibe coding", any standard workflow SaaS can be cloned by an African SME for free. 
            To build a defensible African business, founders must rely on <strong>Proprietary Data</strong> (like AkiliHub) 
            or <strong>Local Network Effects</strong> (like M-Pesa integration) rather than just a UI wrapper.
          </CardContent>
        </Card>
      </div>

      <h2 className="text-3xl font-bold mb-8">Highest Opportunity Sectors (AI Blind Spots)</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {gaps.map((prof) => (
          <Card key={prof.id} className="flex flex-col h-full hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle>{prof.name}</CardTitle>
                <Badge variant={Number(prof.automationRiskScore) < 4 ? "default" : "destructive"}>
                  Risk: {prof.automationRiskScore}/10
                </Badge>
              </div>
              <CardDescription className="text-base mt-2">
                {prof.resilienceRationale}
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <div className="bg-muted/50 p-4 rounded-lg mt-4 border border-border/50">
                <h4 className="font-semibold mb-2 flex items-center gap-2 text-primary">
                  <Target className="w-4 h-4" /> Founder Opportunity
                </h4>
                <p className="text-sm">{prof.founderOpportunity}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
