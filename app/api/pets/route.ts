import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/auth-helpers-nextjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
             try {
               cookiesToSet.forEach(({ name, value, options }) => 
                 cookieStore.set(name, value, options)
               )
             } catch {}
          },
        },
      }
    );

    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user || user.user_metadata.role !== 'veterinarian') {
      return NextResponse.json(
        { error: 'Unauthorized: Access restricted to Veterinarians.' }, 
        { status: 401 }
      );
    }

    // 4. PREPARE THE QUERY
    const searchParams = new URL(request.url).searchParams;
    const targetClientId = searchParams.get('client_id'); 

    let query = supabase
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
          first_name,
          last_name,
          phone
        )
      `)
      .order('name', { ascending: true });
    
    if (targetClientId) {
       query = query.eq('owner_id', targetClientId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching pets:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error: ' + error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('POST /api/pets - body:', body);

    // Required Field Validations
    if (!body.name || !body.owner_id || !body.species || !body.date_of_birth) {
      return NextResponse.json({ 
        error: 'Missing required fields: Name, Owner ID, Species, and DOB are mandatory.' 
      }, { status: 400 });
    }

    // Server-side Date Validation
    if (new Date(body.date_of_birth) > new Date()) {
      return NextResponse.json({ 
        error: 'Date of birth cannot be in the future.' 
      }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('pets')
      .insert([{
        owner_id: body.owner_id,
        name: body.name,
        species: body.species,
        breed: body.breed || null,
        date_of_birth: body.date_of_birth,
        gender: body.gender,
        color: body.color || null,
        weight: parseFloat(body.weight) || 0,
        microchip_number: body.microchip_number || null,
        is_spayed_neutered: body.is_spayed_neutered || false,
        behavioral_notes: body.behavioral_notes || null,
        special_needs: body.special_needs || null,
        current_medical_status: body.current_medical_status || null,
        photo_url: body.photo_url || null,
        is_active: true
      }])
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.log('Created pet:', data);
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('Unexpected error in POST /api/pets:', error);
    return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Pet ID is required' }, { status: 400 });

    const { error } = await supabase.from('pets').delete().eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ message: 'Pet deleted successfully' }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const searchParams = new URL(request.url).searchParams;
    let id = searchParams.get('id') || body.id;

    if (!id) return NextResponse.json({ error: 'Pet ID is required for update' }, { status: 400 });

    const { id: _, ...updates } = body;

    const { data, error } = await supabase
      .from('pets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 });
  }
}