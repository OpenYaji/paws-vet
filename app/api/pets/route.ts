import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseKey);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');

    let query = supabase
      .from('pets')
      .select('*')
      .order('created_at', { ascending: false });

    if (clientId) {
      query = query.eq('owner_id', clientId); // Changed from client_id to owner_id
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();

    console.log('Received pet data:', body);

    // Validate required fields
    if (!body.client_id || !body.name || !body.species) {
      return NextResponse.json(
        { error: 'Missing required fields: client_id, name, species' },
        { status: 400 }
      );
    }

    // Transform client_id to owner_id for database
    const petData = {
      ...body,
      owner_id: body.client_id, // Map client_id to owner_id
    };
    delete petData.client_id; // Remove client_id as it doesn't exist in DB

    const { data, error } = await supabase
      .from('pets')
      .insert([petData])
      .select();

    if (error) {
      console.error('Supabase error creating pet:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.log('Pet created successfully:', data);
    return NextResponse.json(data[0], { status: 201 });
  } catch (error) {
    console.error('Server error creating pet:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
