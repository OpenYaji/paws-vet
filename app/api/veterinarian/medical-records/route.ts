import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const petId = searchParams.get('pet_id');

    let query = supabase
      .from('medical_records')
      .select(`
        *,
        appointments (
          id,
          appointment_number,
          scheduled_start,
          reason_for_visit
        ),
        pets (
          id,
          name,
          species
        ),
        veterinarian:veterinarian_profiles!medical_records_veterinarian_id_fkey (
          id,
          first_name,
          last_name
        )
      `)
      .order('visit_date', { ascending: false });

    // Filter by pet_id if provided
    if (petId) {
      query = query.eq('pet_id', petId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Medical records fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Medical records server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { data, error } = await supabase.from('medical_records').insert([body]).select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
