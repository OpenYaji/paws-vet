import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { updates } = body;

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No inventory updates provided' },
        { status: 400 }
      );
    }

    for (const update of updates) {
      const { productId, quantity } = update;

      const { data: product, error: fetchError } = await supabaseAdmin
        .from('products')
        .select('stock_quantity')
        .eq('id', productId)
        .single();

      if (fetchError || !product) {
        return NextResponse.json(
          { success: false, error: `Product ${productId} not found` },
          { status: 404 }
        );
      }

      const newStock = product.stock_quantity - quantity;

      if (newStock < 0) {
        return NextResponse.json(
          { success: false, error: `Insufficient stock for product ${productId}` },
          { status: 400 }
        );
      }

      const { error: updateError } = await supabaseAdmin
        .from('products')
        .update({ stock_quantity: newStock })
        .eq('id', productId);

      if (updateError) {
        return NextResponse.json(
          { success: false, error: `Failed to update inventory: ${updateError.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
