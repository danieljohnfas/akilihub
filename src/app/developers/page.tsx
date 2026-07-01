import { CodeSnippet } from "@/components/developers/CodeSnippet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Zap, TerminalSquare } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Developer API | AkiliHub",
  description: "Documentation and guides for the AkiliHub Developer API.",
};

export default function DevelopersPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="flex flex-col space-y-6 mb-12">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-3">AkiliHub API</h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Integrate East Africa's most comprehensive professional intelligence data directly into your own applications.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <Shield className="h-5 w-5 text-primary mb-2" />
              <CardTitle className="text-lg">Secure & Reliable</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Built on enterprise-grade infrastructure with automatic rate-limiting and 99.99% uptime.</p>
            </CardContent>
          </Card>
          
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <Zap className="h-5 w-5 text-primary mb-2" />
              <CardTitle className="text-lg">Lightning Fast</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Powered by Edge networking and serverless functions for incredibly low latency.</p>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <TerminalSquare className="h-5 w-5 text-primary mb-2" />
              <CardTitle className="text-lg">Developer First</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">RESTful architecture with standard JSON responses and comprehensive tooling.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="space-y-12">
        <section id="authentication">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold mb-2">Authentication</h2>
            <p className="text-muted-foreground">
              Currently, our public API routes are open for testing. In production, you will need to pass an API key in the Authorization header.
            </p>
          </div>
          
          <CodeSnippet 
            language="bash" 
            code={`curl -X POST https://akilihub.vercel.app/api/chat \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
          />
        </section>

        <section id="rate-limits">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold mb-2">Rate Limits</h2>
            <p className="text-muted-foreground">
              Our API is protected by Upstash Redis to ensure stability for all users.
            </p>
          </div>
          <div className="bg-muted p-4 rounded-lg border flex items-center justify-between">
            <span className="font-medium">Standard Limit</span>
            <Badge variant="secondary" className="text-sm">10 requests per 10 seconds per IP</Badge>
          </div>
        </section>

        <section id="endpoints">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold mb-2">Core Endpoints</h2>
            <p className="text-muted-foreground">
              Interact with our AI intelligence engine directly.
            </p>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Badge className="bg-green-600 hover:bg-green-700">POST</Badge>
                <CardTitle className="font-mono text-lg">/api/chat</CardTitle>
              </div>
              <CardDescription className="mt-2">
                Send a natural language query to the AkiliHub AI engine and receive a structured intelligence report.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="curl" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="curl">cURL</TabsTrigger>
                  <TabsTrigger value="node">Node.js</TabsTrigger>
                  <TabsTrigger value="python">Python</TabsTrigger>
                </TabsList>
                
                <TabsContent value="curl">
                  <CodeSnippet 
                    language="bash" 
                    code={`curl -X POST https://akilihub.vercel.app/api/chat \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "Show me the latest healthcare tenders in Kenya",
    "contextParams": {
      "region": "East Africa"
    }
  }'`}
                  />
                </TabsContent>
                
                <TabsContent value="node">
                  <CodeSnippet 
                    language="javascript" 
                    code={`const response = await fetch('https://akilihub.vercel.app/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: 'Show me the latest healthcare tenders in Kenya'
  }),
});

const data = await response.json();
console.log(data.response);`}
                  />
                </TabsContent>

                <TabsContent value="python">
                  <CodeSnippet 
                    language="python" 
                    code={`import requests

url = "https://akilihub.vercel.app/api/chat"
payload = {
    "query": "Show me the latest healthcare tenders in Kenya"
}
headers = {
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)
print(response.json()["response"])`}
                  />
                </TabsContent>
              </Tabs>
              
              <div className="mt-8">
                <h4 className="font-semibold mb-3">Response Schema</h4>
                <CodeSnippet 
                  language="json" 
                  code={`{
  "response": "Based on the latest data, here are the active healthcare tenders...",
  "confidence": 0.95,
  "sources": [
    "Ministry of Health KE",
    "KEMSA Procurement"
  ],
  "strategyUsed": "Dify (Primary AI Workflow)"
}`}
                />
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="openapi">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold mb-2">OpenAPI Specification</h2>
            <p className="text-muted-foreground">
              Download our OpenAPI spec to instantly generate client libraries in your preferred language.
            </p>
          </div>
          <a href="/api/docs" target="_blank" rel="noreferrer">
            <Button variant="outline" className="w-full sm:w-auto">
              View openapi.json
            </Button>
          </a>
        </section>
      </div>
    </div>
  );
}
