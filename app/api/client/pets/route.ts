// app/api/client/pets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

// GET /api/client/pets?client_id=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');

    if (!clientId) {
      return NextResponse.json(
        { error: 'client_id query parameter is required' },
        { status: 400 }
      );
    }

    const supabase = await getSupabase();

    const { data, error } = await supabase
      .from('pets')
      .select('*')
      .eq('owner_id', clientId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching pets:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err: any) {
    console.error('Unexpected error in GET /api/client/pets:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/client/pets
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      owner_id,
      name,
      species,
      breed,
      date_of_birth,
      gender,
      color,
      weight,
      microchip_number,
      is_spayed_neutered,
      special_needs,
      behavioral_notes,
      current_medical_status,
      photo_url,
    } = body;

    if (!owner_id || !name || !species) {
      return NextResponse.json(
        { error: 'owner_id, name, and species are required' },
        { status: 400 }
      );
    }

    if (weight !== undefined && weight !== null && weight <= 0) {
      return NextResponse.json(
        { error: 'weight must be greater than 0' },
        { status: 400 }
      );
    }

    const supabase = await getSupabase();

    const { data, error } = await supabase
      .from('pets')
      .insert([
        {
          owner_id,
          name,
          species,
          breed: breed ?? null,
          date_of_birth: date_of_birth ?? null,
          gender: gender ?? null,
          color: color ?? null,
          weight: weight ?? null,
          microchip_number: microchip_number ?? null,
          is_spayed_neutered: is_spayed_neutered ?? false,
          special_needs: special_needs ?? null,
          behavioral_notes: behavioral_notes ?? null,
          current_medical_status: current_medical_status ?? null,
          photo_url: photo_url ?? null,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating pet:', error);
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A pet with this microchip number already exists.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error('Unexpected error in POST /api/client/pets:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/client/pets?id=xxx
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const petId = searchParams.get('id');

    if (!petId) {
      return NextResponse.json(
        { error: 'id query parameter is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const allowedFields = [
      'name', 'species', 'breed', 'date_of_birth', 'gender',
      'color', 'weight', 'microchip_number', 'is_spayed_neutered',
      'special_needs', 'behavioral_notes', 'current_medical_status',
      'photo_url', 'is_active',
    ];

    const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const field of allowedFields) {
      if (field in body) updatePayload[field] = body[field];
    }

    if (Object.keys(updatePayload).length === 1) {
      return NextResponse.json(
        { error: 'No valid fields provided for update' },
        { status: 400 }
      );
    }

    const supabase = await getSupabase();

    const { data, error } = await supabase
      .from('pets')
      .update(updatePayload)
      .eq('id', petId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      console.error('Supabase error updating pet:', error);
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A pet with this microchip number already exists.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Pet not found or already deleted' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Unexpected error in PATCH /api/client/pets:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/client/pets?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const petId = searchParams.get('id');

    if (!petId) {
      return NextResponse.json(
        { error: 'id query parameter is required' },
        { status: 400 }
      );
    }

    const supabase = await getSupabase();

    const { data, error } = await supabase
      .from('pets')
      .update({
        deleted_at: new Date().toISOString(),
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', petId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      console.error('Supabase error deleting pet:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Pet not found or already deleted' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Pet deleted successfully', id: petId });
  } catch (err: any) {
    console.error('Unexpected error in DELETE /api/client/pets:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}