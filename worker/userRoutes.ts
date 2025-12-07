import { Hono } from "hono";
import { Env } from './core-utils';
import type { ColorJourneyConfig, GenerateResult } from '../src/types/color-journey';
import { ColorJourneyEngine } from '../src/lib/color-journey';
const paletteCache = new Map<string, { data: GenerateResult, ttl: number }>();
const rateLimits = new Map<string, { count: number, reset: number }>();
export function userRoutes(app: Hono<{ Bindings: Env }>) {
    app.get('/api/test', (c) => c.json({ success: true, data: { name: 'this works' }}));
    app.post('/api/color-journey', async (c) => {
        const ip = c.req.header('cf-connecting-ip') || 'unknown';
        const now = Date.now();
        // Rate Limiting (10 requests per minute)
        if (!rateLimits.has(ip)) {
            rateLimits.set(ip, { count: 0, reset: now + 60 * 1000 });
        }
        const rl = rateLimits.get(ip)!;
        if (now > rl.reset) {
            rl.count = 0;
            rl.reset = now + 60 * 1000;
        }
        if (rl.count >= 10) {
            return c.json({ success: false, error: 'Rate limit exceeded. Please try again in a minute.' }, 429);
        }
        rl.count++;
        try {
            const config = await c.req.json<ColorJourneyConfig>();
            if (!config || !Array.isArray(config.anchors) || typeof config.numColors !== 'number') {
                return c.json({ success: false, error: 'Invalid configuration provided.' }, 400);
            }
            // Caching (5 minute TTL)
            const configStr = JSON.stringify(config);
            const cached = paletteCache.get(configStr);
            if (cached && now < cached.ttl) {
                return c.json({ success: true, data: cached.data, fromCache: true });
            }
            // Generation
            const result: GenerateResult = await ColorJourneyEngine.generate(config);
            paletteCache.set(configStr, { data: result, ttl: now + 5 * 60 * 1000 });
            return c.json({ success: true, data: result });
        } catch (error) {
            console.error('[WORKER ERROR] /api/color-journey:', error);
            const message = error instanceof Error ? error.message : 'An unknown error occurred.';
            return c.json({ success: false, error: 'Failed to generate palette.', details: message }, 500);
        }
    });
}