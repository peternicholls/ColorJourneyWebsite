import { Hono } from "hono";
import { Env } from './core-utils';
import type { ColorJourneyConfig, GenerateResult } from '../src/types/color-journey';
// In a real worker environment, you'd import the WASM module.
// For local dev with `wrangler dev`, you might need a build step to make it available.
// Let's assume a placeholder for now, as direct WASM import needs configuration.
// The actual WASM logic will be implemented in the TS fallback for this phase for simplicity of setup.
import { ColorJourneyEngine } from '../src/lib/color-journey';
export function userRoutes(app: Hono<{ Bindings: Env }>) {
    // Add more routes like this. **DO NOT MODIFY CORS OR OVERRIDE ERROR HANDLERS**
    app.get('/api/test', (c) => c.json({ success: true, data: { name: 'this works' }}));
    app.post('/api/color-journey', async (c) => {
        try {
            const config = await c.req.json<ColorJourneyConfig>();
            // Basic validation
            if (!config || !Array.isArray(config.anchors) || typeof config.numColors !== 'number') {
                return c.json({ success: false, error: 'Invalid configuration provided.' }, 400);
            }
            // In a true WASM worker, you would call the WASM module here.
            // For now, we use the TS fallback from the shared library, which demonstrates the API.
            // This ensures the logic is identical to the client-side fallback.
            const result: GenerateResult = await ColorJourneyEngine.generate(config);
            return c.json({ success: true, data: result });
        } catch (error) {
            console.error('[WORKER ERROR] /api/color-journey:', error);
            const message = error instanceof Error ? error.message : 'An unknown error occurred.';
            return c.json({ success: false, error: 'Failed to generate palette.', details: message }, 500);
        }
    });
}