import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('vaccinations')
      .select('*')
      .order('vaccination_date', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { data: { user }} = await supabase.auth.getUser();
    
    if(user?.user_metadata.role !== 'veterinarian'){
      return NextResponse.json({ error: 'Unauthorized, Vets only' }, { status: 403 });
    }

    const body = await request.json();
    const vaccinationData = {
      pet_id: body.pet_id,
      vaccine_name: body.vaccine_name,
      vaccination_date: body.vaccination_date,
      veterinarian_id: user.id
    }

    const { data, error } = await supabase.from('vaccinations').insert([body]).select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
