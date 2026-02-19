import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET /api/client-admin/appointments/[appointmentId]
export async function GET(
  request: Request,
  // BUG FIX: Next.js 15 requires params to be awaited as a Promise
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  try {
    const { appointmentId } = await params;

    if (!appointmentId) {
      return NextResponse.json({ error: 'appointmentId is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        pets!appointments_pet_id_fkey (
          name, species, breed,
          client_profiles!pets_owner_id_fkey (
            id, first_name, last_name, phone, user_id,
            users!client_profiles_user_id_fkey (
              email
            )
          )
        )
      `)
      .eq('id', appointmentId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('GET /appointments/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/client-admin/appointments/[appointmentId]
export async function PATCH(
  request: Request,
  // BUG FIX: Next.js 15 requires params to be awaited as a Promise
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  try {
    const { appointmentId } = await params;

    if (!appointmentId) {
      return NextResponse.json({ error: 'appointmentId is required' }, { status: 400 });
    }

    const body = await request.json();
    const { appointment_status, cancellation_reason } = body;

    if (!appointment_status) {
      return NextResponse.json({ error: 'appointment_status is required' }, { status: 400 });
    }

    // Validate status value
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];
    if (!validStatuses.includes(appointment_status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // BUG FIX: cancelled status REQUIRES cancellation_reason due to how the DB
    // and API route treat it — enforced here rather than silently defaulting.
    if (appointment_status === 'cancelled' && !cancellation_reason?.trim()) {
      return NextResponse.json(
        { error: 'cancellation_reason is required when cancelling an appointment' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      appointment_status,
      updated_at: new Date().toISOString(),
    };

    if (appointment_status === 'cancelled') {
      updateData.cancellation_reason = cancellation_reason.trim();
      updateData.cancelled_at = new Date().toISOString();
    }

    // BUG FIX: actual_end should only be set when moving to completed, not cleared
    if (appointment_status === 'completed') {
      updateData.actual_end = new Date().toISOString();
    }

    // BUG FIX: removed the incorrect logic that set actual_start = null on 'confirmed'
    // which could clobber actual check-in times already recorded.

    const { data, error } = await supabaseAdmin
      .from('appointments')
      .update(updateData)
      .eq('id', appointmentId)
      .select()
      .single();

    if (error) {
      console.error('PATCH /appointments/[id] DB error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('PATCH /appointments/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
