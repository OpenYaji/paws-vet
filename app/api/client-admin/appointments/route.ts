import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get('owner_id');
    // BUG FIX: Added pagination support to avoid fetching unbounded rows
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const offset = parseInt(searchParams.get('offset') || '0');

    if (ownerId) {
      // Filter by client — must go through pets since appointments has no client_id
      const { data: clientPets, error: petsError } = await supabaseAdmin
        .from('pets')
        .select('id')
        .eq('owner_id', ownerId);

      if (petsError) {
        return NextResponse.json({ error: petsError.message }, { status: 500 });
      }

      const petIds = (clientPets || []).map((p: { id: string }) => p.id);

      if (petIds.length === 0) {
        return NextResponse.json([]);
      }

      const { data: appointments, error } = await supabaseAdmin
        .from('appointments')
        .select(`
          *,
          pets!appointments_pet_id_fkey (
            name,
            species,
            client_profiles!pets_owner_id_fkey (
              id, first_name, last_name
            )
          )
        `)
        .in('pet_id', petIds)
        .order('scheduled_start', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(appointments || []);
    }

    // No owner filter — return all appointments for the CMS list view
    const { data: appointments, error } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        outreach_programs!appointments_outreach_program_id_fkey (title),
        pets!appointments_pet_id_fkey (
          name,
          species,
          breed,
          gender,
          client_profiles!pets_owner_id_fkey (
            id, first_name, last_name
          )
        )
      `)
      .order('scheduled_start', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform for CMS list view
    const transformed = (appointments || []).map((apt: any) => ({
      id: apt.id,
      client_id: apt.pets?.client_profiles?.id || '',
      client_name: apt.pets?.client_profiles
        ? `${apt.pets.client_profiles.first_name} ${apt.pets.client_profiles.last_name}`
        : 'Unknown Client',
      pet_id: apt.pet_id,
      pet_name: apt.pets?.name || 'Unknown',
      breed: apt.pets?.breed || null,
      gender: apt.pets?.gender || null,
      appointment_type_detail: apt.appointment_type_detail || '',
      appointment_number: apt.appointment_number || null,
      duration_minutes: apt.duration_minutes || null,
      payment_method: apt.payment_method || null,
      payment_status: apt.payment_status || null,
      is_aspin_puspin: apt.is_aspin_puspin || false,
      payment_amount: apt.payment_amount || null,
      outreach_program_id: apt.outreach_program_id || null,
      outreach_program_title: apt.outreach_programs?.title || null,
      appointment_date: apt.scheduled_start || '',
      appointment_time: apt.scheduled_start
        ? new Date(apt.scheduled_start).toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit',
          })
        : '',
      status: apt.appointment_status || 'pending',
      appointment_status: apt.appointment_status || 'pending',
      reason: apt.reason_for_visit || 'No reason provided',
      is_emergency: apt.is_emergency || false,
      created_at: apt.created_at,
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    console.error('GET /appointments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
