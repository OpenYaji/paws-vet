import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { updates } = body; // Array of { productId, quantity }

    const errors: string[] = [];

    for (const update of updates) {
      const { productId, quantity } = update;

      // Get current product
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', productId)
        .single();

      if (fetchError || !product) {
        errors.push(`Product ${productId} not found`);
        continue;
      }

      // Calculate new quantity
      const newQuantity = product.stock_quantity - quantity;

      if (newQuantity < 0) {
        errors.push(`Insufficient stock for product ${productId}`);
        continue;
      }

      // Update inventory
      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          stock_quantity: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);

      if (updateError) {
        errors.push(`Failed to update product ${productId}: ${updateError.message}`);
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        errors
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Inventory updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating inventory:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}
