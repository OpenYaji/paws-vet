import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function generatePaymentNumber() {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `PAY-${y}${m}${d}-${rand}`;
}

function generateTransactionReference(method: string) {
  const now = new Date();
  const timestamp = now.getTime().toString(36).toUpperCase();
  const rand = Math.floor(1000 + Math.random() * 9000);
  const prefix = method === 'cash' ? 'CASH' : method === 'card' ? 'CARD' : 'GCASH';
  return `${prefix}-${timestamp}-${rand}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { invoiceId, paymentMethod, amountPaid, cashTendered, referenceNumber } = body;

    if (!invoiceId || !paymentMethod || !amountPaid) {
      return NextResponse.json(
        { success: false, error: 'Missing required payment fields' },
        { status: 400 }
      );
    }

    const paymentNumber = generatePaymentNumber();
    const today = new Date().toISOString().split('T')[0];

    const paymentRow: Record<string, any> = {
      payment_number: paymentNumber,
      invoice_id: invoiceId,
      payment_method: paymentMethod,
      amount_paid: amountPaid,
      payment_date: today,
    };

    // For GCash: use the customer-provided reference number
    // For Cash/Card: auto-generate a transaction reference
    if (referenceNumber) {
      paymentRow.transaction_reference = referenceNumber;
    } else {
      paymentRow.transaction_reference = generateTransactionReference(paymentMethod);
    }

    // Store cash tendered/change info in payment_gateway_response as JSON
    if (cashTendered != null && cashTendered !== undefined) {
      const cashNum = Number(cashTendered);
      const changeAmount = cashNum - Number(amountPaid);
      paymentRow.payment_gateway_response = JSON.stringify({
        cash_tendered: cashNum,
        change_amount: changeAmount,
      });
      paymentRow.notes = `Cash tendered: ₱${cashNum.toFixed(2)}, Change: ₱${changeAmount.toFixed(2)}`;
    } else if (referenceNumber) {
      paymentRow.notes = `GCash Ref: ${referenceNumber}`;
    } else if (paymentMethod === 'card') {
      paymentRow.notes = `Card payment - Ref: ${paymentRow.transaction_reference}`;
    }

    const { data: paymentData, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert(paymentRow)
      .select()
      .single();

    if (paymentError) {
      console.error('Payment insert error:', paymentError);
      return NextResponse.json(
        { success: false, error: `Failed to create payment: ${paymentError.message}` },
        { status: 500 }
      );
    }

    // Update invoice payment_status to 'paid' and amount_paid
    await supabaseAdmin
      .from('invoices')
      .update({
        payment_status: 'paid',
        amount_paid: amountPaid,
      })
      .eq('id', invoiceId);

    return NextResponse.json({
      success: true,
      payment: paymentData,
      paymentNumber,
      transactionReference: paymentRow.transaction_reference,
    });
  } catch (error: any) {
    console.error('Payment API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin
      .from('payments')
      .select(`
        *,
        invoice:invoices(
          invoice_number,
          walk_in_customer_name,
          total_amount,
          client:client_profiles(first_name, last_name)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
