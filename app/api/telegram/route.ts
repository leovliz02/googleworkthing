import { NextRequest } from 'next/server';
import { webhookCallback } from 'grammy';
import { bot } from '@/lib/bot';

// grammY std/http adapter is compatible with standard Web Request/Response in Next.js App Router
const handleUpdate = webhookCallback(bot, 'std/http');

export async function POST(req: NextRequest) {
  const secret = process.env.TELEGRAM_SECRET_TOKEN;
  if (secret) {
    const incomingSecret = req.headers.get('x-telegram-bot-api-secret-token');
    if (incomingSecret !== secret) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  try {
    return await handleUpdate(req);
  } catch (err) {
    console.error('Telegram webhook handler error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function GET() {
  return new Response(
    JSON.stringify({
      status: 'active',
      service: 'nus-transit-telegram-webhook',
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
