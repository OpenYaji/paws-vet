import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { requireClientAdmin } from '@/lib/client-admin-auth';
import { sendClientNotification } from '@/lib/notify';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/** Map appointments.payment_method → payments table enum */
function toPaymentMethodEnum(m: string): string {
  const map: Record<string, string> = {
    gcash: 'online',
    maya: 'online',
    cash: 'cash',
    card: 'credit_card',
    other: 'check',
  };
  return map[m] ?? 'cash';
}

// POST /api/client-admin/appointments/[appointmentId]/payment
// body: { action: 'verify' | 'waive' | 'refund'; admin_user_id: string }
export async function POST(
  request: Request,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  try {
    const auth = await requireClientAdmin(request);
    if (auth.response) return auth.response;

    const { appointmentId } = await params;
    if (!appointmentId) {
      return NextResponse.json({ error: 'appointmentId is required' }, { status: 400 });
    }

    const body = await request.json();
    const { action } = body as { action: string; admin_user_id?: string };
    const admin_user_id = auth.user.id;

    const validActions = ['verify', 'waive', 'refund'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }
    if (!admin_user_id) {
      return NextResponse.json({ error: 'admin_user_id is required' }, { status: 400 });
    }

    // ── 1. Load appointment ──────────────────────────────────────────────────
    const { data: appt, error: apptErr } = await supabaseAdmin
      .from('appointments')
      .select(`
        id, appointment_number, payment_amount, payment_status,
        payment_method, payment_reference, paid_at,
        pets!appointments_pet_id_fkey (
          client_profiles!pets_owner_id_fkey (
            user_id
          )
        )
      `)
      .eq('id', appointmentId)
      .single();

    if (apptErr || !appt) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // ── 2. Look up admin profile (needed for payments.processed_by) ──────────
    const { data: adminProfile } = await supabaseAdmin
      .from('admin_profiles')
      .select('id')
      .eq('user_id', admin_user_id)
      .maybeSingle();

    // ── 3. Determine new payment_status ──────────────────────────────────────
    const newPaymentStatus =
      action === 'verify' ? 'paid' :
      action === 'waive'  ? 'waived' :
      'refunded';

    const updatePayload: Record<string, unknown> = { payment_status: newPaymentStatus };
    if (action === 'verify') {
      updatePayload.paid_at = new Date().toISOString();
      updatePayload.payment_verified_by = admin_user_id ?? null;
      updatePayload.payment_verified_at = new Date().toISOString();
    }
    if (action === 'refund') updatePayload.paid_at = null;

    const { error: updateErr } = await supabaseAdmin
      .from('appointments')
      .update(updatePayload)
      .eq('id', appointmentId);

    if (updateErr) {
      console.error('[payment] update appointments error:', updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // ── 4. If verifying, optionally record in payments table ─────────────────
    if (action === 'verify' && adminProfile) {
      // Check for a linked invoice
      const { data: invoice } = await supabaseAdmin
        .from('invoices')
        .select('id, total_amount')
        .eq('appointment_id', appointmentId)
        .maybeSingle();

      if (invoice) {
        const paymentNumber = `PAY-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`;
        const rawMethod = (appt as { payment_method?: string }).payment_method ?? 'cash';

        // Insert payment record
        const { error: payErr } = await supabaseAdmin
          .from('payments')
          .insert({
            payment_number: paymentNumber,
            invoice_id: invoice.id,
            amount_paid: (appt as { payment_amount?: number }).payment_amount ?? invoice.total_amount,
            payment_method: toPaymentMethodEnum(rawMethod),
            transaction_reference: (appt as { payment_reference?: string }).payment_reference ?? null,
            processed_by: adminProfile.id,
            payment_date: new Date().toISOString(),
          });

        if (payErr) {
          // Non-fatal — log but don't fail the whole request
          console.error('[payment] insert payments error:', payErr);
        } else {
          // Mark invoice as paid
          await supabaseAdmin
            .from('invoices')
            .update({
              payment_status: 'paid',
              amount_paid: (appt as { payment_amount?: number }).payment_amount ?? invoice.total_amount,
            })
            .eq('id', invoice.id);
        }
      }
    }

    // ── 5. Notify client ─────────────────────────────────────────────────────
    const pets = (appt as { pets?: { client_profiles?: { user_id?: string } } }).pets;
    const clientUserId = pets?.client_profiles?.user_id;

    if (clientUserId) {
      const apptNum = (appt as { appointment_number?: string }).appointment_number ?? appointmentId.slice(0, 8);
      const notificationMeta: Record<string, { subject: string; content: string }> = {
        verify: {
          subject: 'Payment Verified',
          content: `Your payment for appointment #${apptNum} has been verified and confirmed. Thank you!`,
        },
        waive: {
          subject: 'Payment Waived',
          content: `The payment for appointment #${apptNum} has been waived by the clinic. No further action is needed.`,
        },
        refund: {
          subject: 'Payment Refunded',
          content: `A refund has been processed for appointment #${apptNum}. Please allow a few business days for it to reflect.`,
        },
      };

      const meta = notificationMeta[action];
      if (meta) {
        await sendClientNotification({
          recipient_id: clientUserId,
          notification_type: 'payment_due',
          subject: meta.subject,
          content: meta.content,
          related_entity_type: 'appointment',
          related_entity_id: appointmentId,
        });
      }
    }

    return NextResponse.json({ success: true, payment_status: newPaymentStatus });
  } catch (error) {
    console.error('[payment] unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
