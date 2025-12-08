import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Copy, Server, Zap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Toaster, toast } from 'sonner';
import { copyToClipboard } from '@/lib/utils/color-export';
import { Header } from '@/components/layout/Header';
const CodeBlock = ({ code, language }: { code: string; language: string }) => {
  const handleCopy = () => {
    copyToClipboard(code).then(success => {
      if (success) toast.success('Copied to clipboard!');
      else toast.error('Failed to copy.');
    });
  };
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative group"
    >
      <pre className={`bg-muted/80 hover:bg-muted p-4 rounded-lg overflow-x-auto text-sm text-muted-foreground font-mono transition-all`}>
        <code className={`language-${language}`}>{code}</code>
      </pre>
      <Button variant="ghost" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={handleCopy}>
        <Copy className="h-4 w-4" />
      </Button>
    </motion.div>
  );
};
const requestBodyExample = `{
  "anchors": ["#F38020", "#667EEA"],
  "numColors": 12,
  "loop": "open",
  "dynamics": {
    "lightness": 0,
    "chroma": 1.0,
    "contrast": 0.05,
    "vibrancy": 0.5,
    "warmth": 0,
    "curveStyle": "linear"
  },
  "variation": {
    "mode": "off",
    "seed": 12345
  }
}`;
const responseExample = `{
  "success": true,
  "data": {
    "palette": [
      { "hex": "#f38020", "ok": { "l": 0.7, "a": 0.1, "b": 0.15 } },
      { "hex": "#e37953", "ok": { "l": 0.7, "a": 0.1, "b": 0.12 } }
    ],
    "config": { ... },
    "diagnostics": {
      "minDeltaE": 0.05,
      "wcagMinRatio": 4.51,
      ...
    }
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
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8 md:py-10 lg:py-12">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-balance leading-tight bg-clip-text text-transparent bg-gradient-hero bg-[length:200%_100%] animate-gradient-shift">API Documentation</h2>
              <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto text-pretty">
                Access <code className="font-mono text-sm bg-muted p-1 rounded-md">/api/color-journey</code> for dynamic, deterministic server-side palettes.
              </p>
            </div>
            <div className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Endpoint</CardTitle>
                  <CardDescription>The API has a single endpoint for generating palettes.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mt-2 font-mono p-3 bg-muted/80 hover:bg-muted rounded-md text-sm transition-colors">
                    <span className="font-bold text-primary-foreground bg-primary px-2 py-1 rounded-md mr-2">POST</span>
                    /api/color-journey
                  </div>
                </CardContent>
              </Card>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-2xl font-display font-semibold">Request Body</h3>
                  <CodeBlock code={requestBodyExample} language="json" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-2xl font-display font-semibold">Response Body</h3>
                  <CodeBlock code={responseExample} language="json" />
                </div>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Examples</CardTitle>
                </CardHeader>
                <CardContent>
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
                  <Button asChild variant="outline" className="w-full mt-4">
                    <Link to="/">Test in Playground</Link>
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Edge Benefits</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Server className="h-8 w-8 text-primary floating" />
                    <h4 className="font-semibold">In-Memory Cache</h4>
                    <p className="text-sm text-muted-foreground">Identical requests are cached for 5 minutes for rapid responses.</p>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <Zap className="h-8 w-8 text-primary floating" style={{ animationDelay: '0.2s' }} />
                    <h4 className="font-semibold">Low Latency</h4>
                    <p className="text-sm text-muted-foreground">Powered by Cloudflare Workers, with WASM loading in &lt;100ms.</p>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <Shield className="h-8 w-8 text-primary floating" style={{ animationDelay: '0.4s' }} />
                    <h4 className="font-semibold">Rate Limiting</h4>
                    <p className="text-sm text-muted-foreground">Basic protection of 10 requests/minute per IP address.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <footer className="border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-sm text-muted-foreground">
          <p>Built with ❤️ at Cloudflare. Based on the OKLab color space by Björn Ottosson (<a href="/LICENSE" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">MIT License</a>). Core C engine by Peter Nicholls.</p>
        </div>
      </footer>
      <Toaster richColors closeButton />
    </div>
  );
}