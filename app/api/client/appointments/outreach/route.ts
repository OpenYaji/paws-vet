import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function jsonError(error: string, status: number, message?: string) {
  return NextResponse.json(
    {
      error,
      ...(message ? { message } : {}),
    },
    { status }
  );
}

async function getDefaultVeterinarianId(): Promise<string> {
  const { data: fullTimeVet, error: fullTimeError } = await supabaseAdmin
    .from('veterinarian_profiles')
    .select('id')
    .eq('employment_status', 'full_time')
    .limit(1)
    .single();

  if (!fullTimeError && fullTimeVet?.id) return fullTimeVet.id;

  const { data: anyVet, error: anyError } = await supabaseAdmin
    .from('veterinarian_profiles')
    .select('id')
    .limit(1)
    .single();

  if (anyError || !anyVet?.id) {
    throw new Error('No veterinarian available');
  }

  return anyVet.id;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonError('unauthorized', 401, 'Session expired. Please log in again.');
    }

    const body = await request.json();

    if (!body?.pet_id || !body?.outreach_program_id || !body?.scheduled_start || !body?.scheduled_end) {
      return jsonError('bad_request', 400, 'pet_id, outreach_program_id, scheduled_start, and scheduled_end are required.');
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('client_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError || !profile?.id) {
      return jsonError('profile_not_found', 404, 'Client profile not found.');
    }

    const { data: pet, error: petError } = await supabaseAdmin
      .from('pets')
      .select('id, owner_id, allow_repeat_kapon_booking')
      .eq('id', body.pet_id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .maybeSingle();

    if (petError || !pet) {
      return jsonError('pet_not_found', 404, 'Selected pet was not found.');
    }

    if (pet.owner_id !== profile.id) {
      return jsonError('forbidden', 403, 'You can only book appointments for your own pets.');
    }

    const { count: priorKaponCount, error: priorError } = await supabaseAdmin
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('pet_id', pet.id)
      .or('appointment_type.eq.kapon,appointment_type_detail.eq.outreach');

    if (priorError) {
      return jsonError('booking_check_failed', 500, priorError.message);
    }

    if ((priorKaponCount ?? 0) > 0 && !pet.allow_repeat_kapon_booking) {
      return jsonError(
        'kapon_repeat_blocked',
        409,
        'This pet has already been registered for Kapon previously and is not eligible for another Kapon/Outreach booking.'
      );
    }

    const { data: program, error: programError } = await supabaseAdmin
      .from('outreach_programs')
      .select('id, title, max_capacity, current_bookings, is_open, is_full')
      .eq('id', body.outreach_program_id)
      .single();

    if (programError || !program) {
      return jsonError('program_not_found', 404, 'Selected outreach program was not found.');
    }

    if (!program.is_open || program.is_full || program.current_bookings >= program.max_capacity) {
      return jsonError('program_full_or_closed', 409, 'Sorry, this outreach program is now full or closed.');
    }

    let veterinarianId = body.veterinarian_id as string | undefined;
    if (!veterinarianId) {
      try {
        veterinarianId = await getDefaultVeterinarianId();
      } catch {
        return jsonError('no_veterinarian', 400, 'No veterinarian available. Please contact the clinic.');
      }
    }

    const payload = {
      pet_id: pet.id,
      booked_by: user.id,
      veterinarian_id: veterinarianId,
      appointment_type: body.appointment_type || 'kapon',
      appointment_type_detail: 'outreach',
      outreach_program_id: program.id,
      scheduled_start: body.scheduled_start,
      scheduled_end: body.scheduled_end,
      reason_for_visit: body.reason_for_visit || `Outreach - ${program.title}`,
      special_instructions: body.special_instructions || null,
      appointment_status: body.appointment_status || 'pending',
      pet_gender_at_booking: body.pet_gender_at_booking || null,
      duration_minutes: body.duration_minutes ?? null,
      is_aspin_puspin: Boolean(body.is_aspin_puspin),
      payment_amount: body.payment_amount ?? 0,
      payment_status: body.payment_status || 'unpaid',
      payment_method: body.payment_method ?? null,
      payment_reference: body.payment_reference ?? null,
      payment_sender_name: body.payment_sender_name ?? null,
      is_emergency: Boolean(body.is_emergency),
    };

    const { data: createdRows, error: bookingError } = await supabaseAdmin
      .rpc('book_outreach_appointment_transaction', {
        p_pet_id: payload.pet_id,
        p_booked_by: payload.booked_by,
        p_veterinarian_id: payload.veterinarian_id,
        p_outreach_program_id: payload.outreach_program_id,
        p_scheduled_start: payload.scheduled_start,
        p_scheduled_end: payload.scheduled_end,
        p_appointment_type: payload.appointment_type,
        p_reason_for_visit: payload.reason_for_visit,
        p_special_instructions: payload.special_instructions,
        p_appointment_status: payload.appointment_status,
        p_pet_gender_at_booking: payload.pet_gender_at_booking,
        p_duration_minutes: payload.duration_minutes,
        p_is_aspin_puspin: payload.is_aspin_puspin,
        p_payment_amount: payload.payment_amount,
        p_payment_status: payload.payment_status,
        p_payment_method: payload.payment_method,
        p_payment_reference: payload.payment_reference,
        p_payment_sender_name: payload.payment_sender_name,
        p_is_emergency: payload.is_emergency,
      });

    if (bookingError) {
      const message = bookingError.message || '';
      if (message.includes('program_not_found')) {
        return jsonError('program_not_found', 404, 'Selected outreach program was not found.');
      }
      if (message.includes('program_full_or_closed')) {
        return jsonError('program_full_or_closed', 409, 'Sorry, this outreach program is now full or closed.');
      }
      if (message.includes('duplicate_booking')) {
        return jsonError('duplicate_booking', 409, 'This pet is already registered for this outreach program.');
      }
      if (message.includes('kapon_repeat_blocked')) {
        return jsonError(
          'kapon_repeat_blocked',
          409,
          'This pet has already been registered for Kapon previously and is not eligible for another Kapon/Outreach booking.'
        );
      }

      return jsonError('booking_create_failed', 500, message || 'Failed to create appointment.');
    }

    const created = Array.isArray(createdRows) ? createdRows[0] : createdRows;

    if (!created?.id) {
      return jsonError('booking_create_failed', 500, 'Failed to create appointment.');
    }

    if (pet.allow_repeat_kapon_booking) {
      const { error: consumeError } = await supabaseAdmin
        .from('pets')
        .update({
          allow_repeat_kapon_booking: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pet.id);

      if (consumeError) {
        console.error('[outreach-booking] Failed to consume allow_repeat_kapon_booking:', consumeError);
      }
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/client/appointments/outreach] Unexpected error:', error);
    return jsonError('internal_error', 500, error?.message || 'Internal server error.');
  }
}
