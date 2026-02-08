import { NextRequest, NextResponse } from 'next/server';
import { railgunTrade } from '@/lib/railgun/trade';
import { railgunEngine } from '@/lib/railgun/engine';

export async function POST(request: NextRequest) {
    const body = await request.json();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const sendEvent = (event: any) => {
                const data = `data: ${JSON.stringify(event)}\n\n`;
                controller.enqueue(encoder.encode(data));
            };

            try {
                // Initialize engine if needed
                if (!railgunEngine.isReady()) {
                    await railgunEngine.initialize();
                }

                await railgunTrade.executePrivateTrade({
                    ...body,
                    onProgress: (progress: any) => {
                        sendEvent({ type: 'progress', data: progress });
                    },
                });

                sendEvent({ type: 'complete', data: { success: true } });
            } catch (error: any) {
                console.error('[API Trade] Failed:', error);
                sendEvent({ type: 'error', data: { success: false, error: error.message } });
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
}
