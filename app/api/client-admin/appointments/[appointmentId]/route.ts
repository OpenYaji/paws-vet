import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import {
  sendClientNotification,
  getAppointmentNotificationPayload,
} from '@/lib/notify';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET /api/client-admin/appointments/[appointmentId]
export async function GET(
  request: Request,
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
        appointment_services (
          id,
          quantity,
          actual_price,
          service_notes,
          services (
            id,
            service_name,
            service_category,
            base_price,
            duration_minutes
          )
        ),
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
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  try {
    const { appointmentId } = await params;

    if (!appointmentId) {
      return NextResponse.json({ error: 'appointmentId is required' }, { status: 400 });
    }

    const body = await request.json();
    const { appointment_status, cancellation_reason, cancelled_by } = body;

    if (!appointment_status) {
      return NextResponse.json({ error: 'appointment_status is required' }, { status: 400 });
    }

    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];
    if (!validStatuses.includes(appointment_status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const trimmedReason = cancellation_reason?.trim() ?? '';
    if (appointment_status === 'cancelled' && !trimmedReason) {
      return NextResponse.json(
        { error: 'A cancellation reason is required when cancelling an appointment.' },
        { status: 400 }
      );
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('appointments')
      .select(`
        id,
        appointment_number,
        appointment_status,
        scheduled_start,
        booked_by,
        pets!appointments_pet_id_fkey (
          client_profiles!pets_owner_id_fkey (
            user_id
          )
        )
      `)
      .eq('id', appointmentId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {
      appointment_status,
      updated_at: new Date().toISOString(),
    };

    if (appointment_status === 'cancelled') {
      updateData.cancellation_reason = trimmedReason;
      updateData.cancelled_at = new Date().toISOString();
      // FIX: cancelled_by is required by the DB constraint — use who's cancelling
      // prefer the admin user passed from frontend, fall back to whoever booked it
      updateData.cancelled_by = cancelled_by || existing.booked_by;
    } else {
      // Clear cancellation fields when switching away from cancelled
      updateData.cancellation_reason = null;
      updateData.cancelled_at = null;
      updateData.cancelled_by = null;
    }

    if (appointment_status === 'completed') {
      updateData.actual_end = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from('appointments')
      .update(updateData)
      .eq('id', appointmentId)
      .select()
      .single();

    if (error) {
      console.error('PATCH /appointments/[id] DB error:', error);
      return NextResponse.json(
        { error: error.message, details: error.details || '' },
        { status: 500 }
      );
    }

    // Send notification if status changed
    if (appointment_status !== existing.appointment_status) {
      const clientUserId =
        existing.booked_by ||
        (existing.pets as any)?.client_profiles?.user_id;

      if (clientUserId) {
        const { type, subject, content } = getAppointmentNotificationPayload(
          appointment_status,
          existing.appointment_number,
          existing.scheduled_start,
        );

        await sendClientNotification({
          recipient_id: clientUserId,
          notification_type: type,
          subject,
          content,
          related_entity_type: 'appointments',
          related_entity_id: appointmentId,
        });
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('PATCH /appointments/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}