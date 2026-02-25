import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    
    let query = supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('product_name');

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ products: data || [] });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    // Check if this product has been used in any invoice — if so, hard-deletion
    // is not possible (FK constraint on invoice_line_items.product_id → products.id).
    const { data: lineItems, error: checkError } = await supabaseAdmin
      .from('invoice_line_items')
      .select('id')
      .eq('product_id', id)
      .limit(1);

    if (checkError) throw checkError;

    if (lineItems && lineItems.length > 0) {
      return NextResponse.json(
        { error: 'has_history', message: 'This product has sales history and cannot be deleted.' },
        { status: 409 }
      );
    }

    // No invoice history — safe to hard-delete.
    // Delete product_batches first (FK: product_batches.product_id → products.id).
    const { error: batchError } = await supabaseAdmin
      .from('product_batches')
      .delete()
      .eq('product_id', id);
    if (batchError) throw batchError;

    const { error } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete product' },
      { status: 500 }
    );
  }
}
