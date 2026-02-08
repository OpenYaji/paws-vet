import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoiceId, paymentMethod, amountPaid, cashTendered, isWalkIn } = body;

    // Generate payment number
    const paymentNumber = `PAY-${Date.now()}`;

    // Create payment record
    const paymentData = {
      payment_number: paymentNumber,
      invoice_id: invoiceId,
      payment_date: new Date().toISOString().split('T')[0],
      amount_paid: amountPaid,
      payment_method: paymentMethod,
      transaction_reference: `${paymentMethod.toUpperCase()}-${Date.now()}`,
      notes: `POS Transaction - ${isWalkIn ? 'Walk-in' : 'Registered'} Customer${
        cashTendered ? `\nCash Tendered: ₱${cashTendered.toFixed(2)}\nChange: ₱${(cashTendered - amountPaid).toFixed(2)}` : ''
      }`,
    };

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert(paymentData)
      .select()
      .single();

    if (paymentError) {
      throw new Error(`Failed to create payment: ${paymentError.message}`);
    }

    return NextResponse.json({
      success: true,
      payment,
      paymentNumber,
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating payment:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        invoice:invoices(
          invoice_number,
          walk_in_customer_name,
          client:client_profiles(first_name, last_name)
        )
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
