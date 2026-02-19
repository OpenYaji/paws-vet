import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// --- GET ALL PETS with RELATIONS ---
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const species = searchParams.get('species');
    const search = searchParams.get('search');

    let query = supabase
      .from('pets')
      .select(`
        *,
        owner:client_profiles (
          first_name,
          last_name,
          phone
        ),
        vaccinations:vaccination_records (
          id,
          vaccine_name,
          administered_date
        ),
        medical_records (
          id,
          visit_date,
          chief_complaint,
          diagnosis
        ),
        appointments (
          id,
          scheduled_start,
          appointment_status,
          appointment_type
        )
      `)
      .is('deleted_at', null);

    if (species && species !== 'all') {
      query = query.eq('species', species);
    }
    
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Ensure database photo_url is mapped to frontend image_url
    const formattedData = data.map(pet => ({
      ...pet,
      image_url: pet.photo_url 
    }));

    return NextResponse.json(formattedData);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// --- CREATE NEW PET ---
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields based on SQL schema
    if (!body.name || !body.owner_id || !body.species) {
      return NextResponse.json({ error: 'Missing required pet data' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('pets')
      .insert([{
        name: body.name,
        owner_id: body.owner_id,
        species: body.species,
        breed: body.breed,
        gender: body.gender,
        date_of_birth: body.date_of_birth,
        weight: body.weight,
        color: body.color,
        microchip_number: body.microchip_number,
        photo_url: body.image_url // Maps frontend image_url to DB photo_url
      }])
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// --- UPDATE PET (Patch Image or Details) ---
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ error: 'Pet ID is required' }, { status: 400 });

    // Handle column mapping if frontend sends image_url
    if (updates.image_url) {
      updates.photo_url = updates.image_url;
      delete updates.image_url;
    }

    const { data, error } = await supabase
      .from('pets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// --- SOFT DELETE (Archive Pet) ---
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Pet ID is required' }, { status: 400 });

    // Soft delete by setting deleted_at timestamp
    const { error } = await supabase
      .from('pets')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ message: 'Pet archived successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}