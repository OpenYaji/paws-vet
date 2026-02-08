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
    
    const status = searchParams.get('status');
    const date = searchParams.get('date');
    const veterinarian = searchParams.get('veterinarian');
    const search = searchParams.get('search');

    let query = supabase
      .from('appointments')
      .select(`
        *,
        pet:pets(id, name, species, breed),
        veterinarian:veterinarian_profiles(id, first_name, last_name, specializations),
        client:client_profiles!pets(id, first_name, last_name, phone, user:users(email))
      `)
      .order('scheduled_start', { ascending: false });

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('appointment_status', status);
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      query = query
        .gte('scheduled_start', startOfDay.toISOString())
        .lte('scheduled_start', endOfDay.toISOString());
    }

    if (veterinarian) {
      query = query.eq('veterinarian_id', veterinarian);
    }

    if (search) {
      query = query.or(`appointment_number.ilike.%${search}%,reason_for_visit.ilike.%${search}%`);
    }

    const { data, error } = await query;

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
    const supabase = getSupabaseClient();
    const body = await request.json();

    const { data, error } = await supabase.from('appointments').insert([body]).select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
