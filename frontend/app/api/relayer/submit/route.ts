import { NextRequest } from 'next/server';
import { relayerService } from '@/lib/railgun/relayer';
import { privateMarketSwapService, type PrivateMarketSwapRequest } from '@/lib/railgun/privateMarketSwapService';
import type { PrivateSwapProgress } from '@/lib/railgun/types';

export const maxDuration = 300; // 5 minutes max

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as PrivateMarketSwapRequest;

        // Validate required fields
        if (!body.marketId || !body.amount || !body.userAddress) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: marketId, amount, userAddress' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        if (!relayerService.isConfigured()) {
            return new Response(
                JSON.stringify({ error: 'Server relayer not configured. Add RELAYER_PRIVATE_KEY to .env.local' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        console.log('[API] Starting private market swap');
        console.log(`[API] Market: ${body.marketId}`);
        console.log(`[API] Action: ${body.action}`);
        console.log(`[API] Amount: ${body.amount} wei`);
        console.log(`[API] User: ${body.userAddress}`);

        const encoder = new TextEncoder();

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const progress of privateMarketSwapService.executePrivateSwapStream(body)) {
                        const data = `data: ${JSON.stringify(progress)}\n\n`;
                        controller.enqueue(encoder.encode(data));

                        if (progress.step === 'complete' || progress.step === 'error') {
                            break;
                        }
                    }
                } catch (error) {
                    console.error('[API] Stream error:', error);
                    const errorProgress: PrivateSwapProgress = {
                        step: 'error',
                        progress: 0,
                        message: error instanceof Error ? error.message : 'Unknown error',
                    };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorProgress)}\n\n`));
                } finally {
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error) {
        console.error('[API] Request failed:', error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
