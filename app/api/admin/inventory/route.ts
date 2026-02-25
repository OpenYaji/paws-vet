import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { inventoryEmitter } from '@/lib/inventory-events';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* ─────────────────────────────────────────────────
   GET /api/admin/inventory
   Returns all active products + all product_batches
───────────────────────────────────────────────── */
export async function GET() {
  try {
    const [{ data: products, error: prodErr }, { data: batches, error: batchErr }] =
      await Promise.all([
        supabaseAdmin
          .from('products')
          .select('*')
          .eq('is_active', true)
          .order('product_name'),
        supabaseAdmin
          .from('product_batches')
          .select('*')
          .order('created_at'),
      ]);

    if (prodErr)  throw prodErr;
    if (batchErr) throw batchErr;

    return NextResponse.json({ products: products ?? [], batches: batches ?? [] });
  } catch (err: any) {
    console.error('[inventory GET]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ─────────────────────────────────────────────────
   POST /api/admin/inventory
   Body: product fields (no id)
   Creates a new product with is_active = true
───────────────────────────────────────────────── */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, error } = await supabaseAdmin
      .from('products')
      .insert({ ...body, is_active: true })
      .select()
      .single();

    if (error) throw error;
    inventoryEmitter.emit('change');
    return NextResponse.json({ product: data });
  } catch (err: any) {
    console.error('[inventory POST]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ─────────────────────────────────────────────────
   PUT /api/admin/inventory
   Body: { id, ...productFields }
   Updates an existing product by id
───────────────────────────────────────────────── */
export async function PUT(request: NextRequest) {
  try {
    const { id, ...payload } = await request.json();
    if (!id) return NextResponse.json({ error: 'Product id required' }, { status: 400 });

    const { error } = await supabaseAdmin
      .from('products')
      .update(payload)
      .eq('id', id);

    if (error) throw error;
    inventoryEmitter.emit('change');
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[inventory PUT]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ─────────────────────────────────────────────────
   PATCH /api/admin/inventory
   Body: { productId, batch: { ... }, newQty }
   Inserts a new stock batch and updates product stock_quantity
───────────────────────────────────────────────── */
export async function PATCH(request: NextRequest) {
  try {
    const { productId, batch, newQty } = await request.json();
    if (!productId || !batch) {
      return NextResponse.json({ error: 'productId and batch required' }, { status: 400 });
    }

    const { error: batchErr } = await supabaseAdmin
      .from('product_batches')
      .insert(batch);
    if (batchErr) throw batchErr;

    const { error: stockErr } = await supabaseAdmin
      .from('products')
      .update({ stock_quantity: newQty })
      .eq('id', productId);
    if (stockErr) throw stockErr;

    inventoryEmitter.emit('change');
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[inventory PATCH]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ─────────────────────────────────────────────────
   DELETE /api/admin/inventory
   Body: { batchId, productId, newQty }
   Removes a batch and updates product stock_quantity
───────────────────────────────────────────────── */
export async function DELETE(request: NextRequest) {
  try {
    const { batchId, productId, newQty } = await request.json();
    if (!batchId || !productId) {
      return NextResponse.json({ error: 'batchId and productId required' }, { status: 400 });
    }

    const { error: batchErr } = await supabaseAdmin
      .from('product_batches')
      .delete()
      .eq('id', batchId);
    if (batchErr) throw batchErr;

    const { error: stockErr } = await supabaseAdmin
      .from('products')
      .update({ stock_quantity: newQty })
      .eq('id', productId);
    if (stockErr) throw stockErr;

    inventoryEmitter.emit('change');
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[inventory DELETE]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
