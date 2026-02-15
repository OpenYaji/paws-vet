import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('pets')
      .select(`
        id,
        owner_id,
        name,
        species,
        breed,
        color,
        gender,
        weight,
        microchip_number,
        client_profiles (
          id,
          user_id,
          first_name,
          last_name,
          phone
        )
      `)
      .order('name', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);

  } catch (error) {
    // This catch block handles unexpected crashes (like network issues)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || !body.owner_id || !body.species) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

     const newPet = {
      name: body.name,
      species: body.species,
      breed: body.breed,
      color: body.color,
      weight: body.weight,
      owner_id: body.owner_id,
      photo_url: body.photo_url,
    };

    const { data, error } = await supabase
        .from('pets')
        .insert([newPet])
        .select()
        .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Pet ID is required' }, { status: 400 });
    }

    const { error } = await supabase.from('pets').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: 'Pet deleted successfully' }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    
    // We expect the ID to be passed either in the URL or the Body.
    // Let's check the URL first (standard REST practice).
    const searchParams = new URL(request.url).searchParams;
    let id = searchParams.get('id');

    // If not in URL, check body
    if (!id && body.id) {
        id = body.id;
    }

    if (!id) {
      return NextResponse.json({ error: 'Pet ID is required for update' }, { status: 400 });
    }

    // Prepare update object (remove ID from the fields to update)
    const { id: _, ...updates } = body;

    const { data, error } = await supabase
      .from('pets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}