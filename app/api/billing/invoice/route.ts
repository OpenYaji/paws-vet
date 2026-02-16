import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function generateInvoiceNumber() {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${y}${m}${d}-${rand}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { invoice, lineItems, isWalkIn } = body;

    if (!invoice || !lineItems || lineItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing invoice data or line items' },
        { status: 400 }
      );
    }

    const invoiceNumber = generateInvoiceNumber();
    const today = new Date().toISOString().split('T')[0];

    // Build the invoice row matching the actual schema
    const invoiceRow: Record<string, any> = {
      invoice_number: invoiceNumber,
      subtotal: invoice.subtotal,
      tax_amount: invoice.taxAmount,
      discount_amount: invoice.discountAmount,
      total_amount: invoice.total,
      amount_paid: invoice.total,
      payment_status: 'paid',
      notes: invoice.notes || '',
      issue_date: today,
      due_date: today,
    };

    if (isWalkIn) {
      invoiceRow.walk_in_customer_name = invoice.walkInName || 'Walk-in Customer';
    } else if (invoice.clientId) {
      invoiceRow.client_id = invoice.clientId;
    }

    const { data: invoiceData, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .insert(invoiceRow)
      .select()
      .single();

    if (invoiceError) {
      console.error('Invoice insert error:', invoiceError);
      return NextResponse.json(
        { success: false, error: `Failed to create invoice: ${invoiceError.message}` },
        { status: 500 }
      );
    }

    // Insert line items matching the actual schema
    const lineItemRows = lineItems.map((item: any) => {
      const row: Record<string, any> = {
        invoice_id: invoiceData.id,
        item_type: item.type,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        line_total: item.lineTotal,
        is_taxable: true,
      };

      // Use the correct FK column based on item type
      if (item.type === 'service') {
        row.service_id = item.itemId;
      } else if (item.type === 'product') {
        row.product_id = item.itemId;
      }

      return row;
    });

    const { error: lineItemsError } = await supabaseAdmin
      .from('invoice_line_items')
      .insert(lineItemRows);

    if (lineItemsError) {
      console.error('Line items insert error:', lineItemsError);
      // Clean up the invoice on failure
      await supabaseAdmin.from('invoices').delete().eq('id', invoiceData.id);
      return NextResponse.json(
        { success: false, error: `Failed to create line items: ${lineItemsError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      invoice: invoiceData,
      invoiceNumber,
    });
  } catch (error: any) {
    console.error('Invoice API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
