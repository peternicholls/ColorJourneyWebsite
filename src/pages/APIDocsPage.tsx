import React from 'react';
import { Link } from 'react-router-dom';
import { Copy, Palette, Github, Server, Zap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Toaster, toast } from 'sonner';
import { ThemeToggle } from '@/components/ThemeToggle';
import { copyToClipboard } from '@/lib/utils/color-export';
const CodeBlock = ({ code, language }: { code: string; language: string }) => {
  const handleCopy = () => {
    copyToClipboard(code).then(success => {
      if (success) toast.success('Copied to clipboard!');
      else toast.error('Failed to copy.');
    });
  };
  return (
    <div className="relative group">
      <pre className={`bg-muted p-4 rounded-lg overflow-x-auto text-sm text-muted-foreground`}>
        <code className={`language-${language}`}>{code}</code>
      </pre>
      <Button variant="ghost" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={handleCopy}>
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  );
};
const requestBodyExample = `{
  "anchors": ["#F38020", "#667EEA"],
  "numColors": 12,
  "loop": "open",
  "granularity": "discrete",
  "dynamics": {
    "lightness": 0,
    "chroma": 1.0,
    "contrast": 0.05,
    "vibrancy": 0.5,
    "warmth": 0
  },
  "variation": {
    "mode": "off",
    "seed": 12345
  }
}`;
const curlExample = `curl -X POST https://<YOUR_WORKER_URL>/api/color-journey \\
-H "Content-Type: application/json" \\
-d '${requestBodyExample}'`;
const fetchExample = `const response = await fetch('https://<YOUR_WORKER_URL>/api/color-journey', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(${requestBodyExample})
});
const result = await response.json();
console.log(result);`;
export function APIDocsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-primary">
                  <Palette className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-display font-bold">Color Journey</h1>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" asChild>
                <a href="https://github.com/cloudflare/workers-ai-apis" target="_blank" rel="noopener noreferrer"><Github className="h-5 w-5" /></a>
              </Button>
              <ThemeToggle className="relative top-0 right-0" />
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-display font-bold text-balance">API Documentation</h2>
            <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
              Generate color palettes programmatically via our Cloudflare Worker API.
            </p>
          </div>
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Endpoint</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">The API has a single endpoint for generating palettes.</p>
                <div className="mt-2 font-mono p-3 bg-muted rounded-md text-sm">
                  <span className="font-bold text-primary-foreground bg-primary px-2 py-1 rounded-md mr-2">POST</span>
                  /api/color-journey
                </div>
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-2xl font-display font-semibold">Request</h3>
                <p className="text-muted-foreground">Send a JSON body with a <code className="font-mono text-sm bg-muted p-1 rounded-md">ColorJourneyConfig</code> object.</p>
                <CodeBlock code={requestBodyExample} language="json" />
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-display font-semibold">Examples</h3>
                <Accordion type="single" collapsible defaultValue="item-1">
                  <AccordionItem value="item-1">
                    <AccordionTrigger>cURL</AccordionTrigger>
                    <AccordionContent><CodeBlock code={curlExample} language="bash" /></AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-2">
                    <AccordionTrigger>JavaScript Fetch</AccordionTrigger>
                    <AccordionContent><CodeBlock code={fetchExample} language="javascript" /></AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Edge Benefits</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Server className="h-8 w-8 text-primary" />
                  <h4 className="font-semibold">In-Memory Cache</h4>
                  <p className="text-sm text-muted-foreground">Identical requests are cached for 5 minutes for rapid responses.</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Zap className="h-8 w-8 text-primary" />
                  <h4 className="font-semibold">Low Latency</h4>
                  <p className="text-sm text-muted-foreground">Powered by Cloudflare Workers, running close to your users.</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Shield className="h-8 w-8 text-primary" />
                  <h4 className="font-semibold">Rate Limiting</h4>
                  <p className="text-sm text-muted-foreground">Basic protection of 10 requests/minute per IP address.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Toaster richColors closeButton />
    </div>
  );
}