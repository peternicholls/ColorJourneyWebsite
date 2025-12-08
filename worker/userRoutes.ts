import { Hono } from "hono";
import { Env } from './core-utils';
import type { ColorJourneyConfig, GenerateResult } from '../src/types/color-journey';
import { ColorJourneyEngine } from '../src/lib/color-journey';
import { ColorJourneyConfigSchema } from '../src/lib/utils/color-export';
const paletteCache = new Map<string, { data: GenerateResult, ttl: number }>();
const rateLimits = new Map<string, { count: number, reset: number }>();
export function userRoutes(app: Hono<{ Bindings: Env }>) {
    app.post('/api/color-journey', async (c) => {
        const ip = c.req.header('cf-connecting-ip') || 'unknown';
        const now = Date.now();
        // Rate Limiting (10 requests per minute)
        const rl = rateLimits.get(ip) || { count: 0, reset: now + 60 * 1000 };
        if (now > rl.reset) {
            rl.count = 0;
            rl.reset = now + 60 * 1000;
        }
        if (rl.count >= 10) {
            console.warn(`Rate limit exceeded for IP: ${ip}`);
            return c.json({ success: false, error: 'Rate limit exceeded. Please try again in a minute.' }, 429);
        }
        rl.count++;
        rateLimits.set(ip, rl);
        try {
            const body = await c.req.json();
            const validation = ColorJourneyConfigSchema.safeParse(body);
            if (!validation.success) {
                return c.json({ success: false, error: 'Invalid configuration provided.', details: validation.error.flatten() }, 400);
            }
            const config = validation.data;
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