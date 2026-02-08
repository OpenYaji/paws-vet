import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoice, lineItems, isWalkIn } = body;

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}`;

    // Prepare invoice data
    const invoiceData: any = {
      invoice_number: invoiceNumber,
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date().toISOString().split('T')[0],
      subtotal: invoice.subtotal,
      tax_amount: invoice.taxAmount,
      discount_amount: invoice.discountAmount,
      total_amount: invoice.total,
      amount_paid: invoice.total,
      payment_status: 'paid',
      notes: invoice.notes,
    };

    if (isWalkIn) {
      invoiceData.walk_in_customer_name = invoice.walkInName;
    } else {
      invoiceData.client_id = invoice.clientId;
    }

    // Create invoice
    const { data: createdInvoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert(invoiceData)
      .select()
      .single();

    if (invoiceError) {
      throw new Error(`Failed to create invoice: ${invoiceError.message}`);
    }

    // Create line items
    const lineItemsData = lineItems.map((item: any) => ({
      invoice_id: createdInvoice.id,
      item_type: item.type,
      service_id: item.type === 'service' ? item.itemId : null,
      product_id: item.type === 'product' ? item.itemId : null,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      line_total: item.lineTotal,
      is_taxable: true,
    }));

    const { error: lineItemsError } = await supabase
      .from('invoice_line_items')
      .insert(lineItemsData);

    if (lineItemsError) {
      throw new Error(`Failed to create line items: ${lineItemsError.message}`);
    }

    return NextResponse.json({
      success: true,
      invoice: createdInvoice,
      invoiceNumber,
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        client:client_profiles(first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
