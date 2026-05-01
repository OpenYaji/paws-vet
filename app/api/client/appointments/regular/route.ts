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

    if (!body?.pet_id || !body?.scheduled_start || !body?.scheduled_end || !body?.service_id) {
      return jsonError('bad_request', 400, 'pet_id, scheduled_start, scheduled_end, and service_id are required.');
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

    // Only perform kapon-related checks if this is a kapon service
    if (body.is_kapon_service) {
      const { count: priorRegularCount, error: priorError } = await supabaseAdmin
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('pet_id', pet.id)
        .eq('appointment_type_detail', 'regular');

      if (priorError) {
        return jsonError('booking_check_failed', 500, priorError.message);
      }

      if ((priorRegularCount ?? 0) > 0 && !pet.allow_repeat_kapon_booking) {
        return jsonError(
          'kapon_repeat_blocked',
          409,
          'This pet is currently disabled for repeat kapon booking. Please contact the clinic/admin to enable "Allow Again".'
        );
      }
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
      appointment_type: body.appointment_type || (body.is_kapon_service ? 'kapon' : 'surgery'),
      appointment_type_detail: 'regular',
      scheduled_start: body.scheduled_start,
      scheduled_end: body.scheduled_end,
      reason_for_visit: body.reason_for_visit || '',
      special_instructions: body.special_instructions || null,
      appointment_status: body.appointment_status || 'pending',
      pet_gender_at_booking: body.pet_gender_at_booking || null,
      duration_minutes: body.duration_minutes ?? null,
      is_aspin_puspin: Boolean(body.is_aspin_puspin),
      payment_amount: body.payment_amount ?? null,
      payment_status: body.payment_status || 'unpaid',
      payment_method: body.payment_method ?? null,
      payment_reference: body.payment_reference ?? null,
      payment_sender_name: body.payment_sender_name ?? null,
      is_emergency: Boolean(body.is_emergency),
    };

    const { data: created, error: insertError } = await supabaseAdmin
      .from('appointments')
      .insert(payload)
      .select('id, appointment_number')
      .single();

    if (insertError) {
      const message = insertError.message || '';
      if (message.includes('kapon_repeat_blocked')) {
        return jsonError(
          'kapon_repeat_blocked',
          409,
          'This pet is currently disabled for repeat kapon booking. Please contact the clinic/admin to enable "Allow Again".'
        );
      }
      return jsonError('booking_create_failed', 500, message || 'Failed to create appointment.');
    }

    // Insert into appointment_services
    const { error: serviceInsertError } = await supabaseAdmin
      .from('appointment_services')
      .insert({
        appointment_id: created.id,
        service_id: body.service_id,
        actual_price: body.payment_amount ?? null,
        quantity: 1,
      });

    if (serviceInsertError) {
      console.error('[regular-booking] Failed to insert appointment_services:', serviceInsertError);
      // Log error but don't fail the appointment creation
    }

    // Only consume allow_repeat_kapon_booking if this is a kapon service
    if (body.is_kapon_service && pet.allow_repeat_kapon_booking) {
      const { error: consumeError } = await supabaseAdmin
        .from('pets')
        .update({
          allow_repeat_kapon_booking: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pet.id);

      if (consumeError) {
        console.error('[regular-booking] Failed to consume allow_repeat_kapon_booking:', consumeError);
      }
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/client/appointments/regular] Unexpected error:', error);
    return jsonError('internal_error', 500, error?.message || 'Internal server error.');
  }
}
