import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { inventoryEmitter } from '@/lib/inventory-events';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const EXPIRY_SOON_DAYS = 30;

interface AlertCounts {
  expired: number;
  expiringSoon: number;
  lowStock: number;
  oos: number;
}

async function computeAlerts(): Promise<AlertCounts> {
  const [{ data: prods }, { data: batchRows }] = await Promise.all([
    supabaseAdmin
      .from('products')
      .select('id, stock_quantity, low_stock_threshold, expiration_date')
      .eq('is_active', true),
    supabaseAdmin
      .from('product_batches')
      .select('product_id, expiration_date'),
  ]);

  if (!prods) return { expired: 0, expiringSoon: 0, lowStock: 0, oos: 0 };

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const soonCutoff = new Date(today);
  soonCutoff.setDate(today.getDate() + EXPIRY_SOON_DAYS);

  const batchMap: Record<string, string[]> = {};
  for (const b of (batchRows ?? [])) {
    if (b.expiration_date) {
      if (!batchMap[b.product_id]) batchMap[b.product_id] = [];
      batchMap[b.product_id].push(b.expiration_date);
    }
  }

  let expired = 0, expiringSoon = 0, lowStock = 0, oos = 0;
  for (const p of prods) {
    const dates  = batchMap[p.id] ?? [];
    const effExp = dates.length
      ? dates.reduce((min, d) => (d < min ? d : min))
      : p.expiration_date;

    if (effExp) {
      const expDate = new Date(effExp);
      if (expDate < today)            expired++;
      else if (expDate <= soonCutoff) expiringSoon++;
    }

    if (p.stock_quantity === 0)                          oos++;
    else if (p.stock_quantity <= p.low_stock_threshold)  lowStock++;
  }

  return { expired, expiringSoon, lowStock, oos };
}

/* ─────────────────────────────────────────────────
   GET /api/admin/inventory/alerts
   Opens an SSE stream; pushes updated counts whenever
   any inventory mutation fires the 'change' event.
───────────────────────────────────────────────── */
export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Helper: serialise and send one SSE data frame
      const send = (data: AlertCounts) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // controller already closed — ignore
        }
      };

      // Send current counts immediately on connect
      try {
        send(await computeAlerts());
      } catch (e) {
        console.error('[inventory/alerts] initial fetch failed', e);
      }

      // Re-compute and push whenever a mutation fires 'change'
      const onChange = async () => {
        try {
          send(await computeAlerts());
        } catch (e) {
          console.error('[inventory/alerts] onChange fetch failed', e);
        }
      };

      inventoryEmitter.on('change', onChange);

      // Clean up when the client disconnects
      return () => {
        inventoryEmitter.off('change', onChange);
      };
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection:      'keep-alive',
    },
  });
}
