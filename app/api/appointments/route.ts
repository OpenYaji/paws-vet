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

    // Build the query with proper joins
    let query = supabase
      .from('appointments')
      .select(`
        *,
        pet:pets!appointments_pet_id_fkey(
          id,
          name,
          species,
          breed,
          owner_id,
          client:client_profiles!pets_owner_id_fkey(
            id,
            first_name,
            last_name,
            phone,
            email:users!client_profiles_user_id_fkey(email)
          )
        ),
        veterinarian:veterinarian_profiles!appointments_veterinarian_id_fkey(
          id,
          first_name,
          last_name,
          specializations
        )
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
      console.error('Supabase error:', error);
      return NextResponse.json({ 
        error: error.message,
        details: error.details || 'Query failed',
        hint: error.hint || ''
      }, { status: 400 });
    }

    // Transform the data to flatten the nested client structure
    const transformedData = (data || []).map((appointment: any) => ({
      ...appointment,
      client: appointment.pet?.client || null,
      pet: {
        id: appointment.pet?.id,
        name: appointment.pet?.name,
        species: appointment.pet?.species,
        breed: appointment.pet?.breed,
      }
    }));

    console.log('Fetched appointments:', transformedData.length);
    return NextResponse.json(transformedData);
  } catch (error: any) {
    console.error('Server error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message || 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();

    console.log('Received appointment data:', body);

    // Validate required fields
    if (!body.pet_id || !body.scheduled_start || !body.scheduled_end) {
      console.error('Missing required fields:', { 
        pet_id: body.pet_id, 
        scheduled_start: body.scheduled_start, 
        scheduled_end: body.scheduled_end 
      });
      return NextResponse.json({ 
        error: 'Missing required fields',
        details: 'pet_id, scheduled_start, and scheduled_end are required' 
      }, { status: 400 });
    }

    // Get the current user from auth header
    const authHeader = request.headers.get('authorization');
    let bookedBy = body.booked_by;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (user) {
        bookedBy = user.id;
      }
    }

    // Generate appointment number
    const appointmentNumber = `APT-${Date.now()}`;

    // Get default veterinarian if not provided
    let veterinarianId = body.veterinarian_id;
    if (!veterinarianId) {
      try {
        veterinarianId = await getDefaultVeterinarian(supabase);
      } catch (error) {
        console.error('No veterinarian available:', error);
        return NextResponse.json({ 
          error: 'No veterinarian available',
          details: 'Please contact the clinic to schedule an appointment' 
        }, { status: 400 });
      }
    }

    // Build appointment data - no client_id column in schema
    const appointmentData = {
      appointment_number: appointmentNumber,
      pet_id: body.pet_id,
      veterinarian_id: veterinarianId,
      booked_by: bookedBy,
      appointment_type: body.appointment_type || 'consultation', // Changed from 'checkup' to 'consultation'
      appointment_status: body.appointment_status || 'pending',
      scheduled_start: body.scheduled_start,
      scheduled_end: body.scheduled_end,
      reason_for_visit: body.reason_for_visit || 'General appointment',
      special_instructions: body.special_instructions || null,
      is_emergency: body.is_emergency || false,
    };

    console.log('Creating appointment with data:', appointmentData);

    const { data, error } = await supabase
      .from('appointments')
      .insert([appointmentData])
      .select(`
        *,
        pet:pets(id, name, species, breed, owner_id),
        veterinarian:veterinarian_profiles(id, first_name, last_name)
      `);

    if (error) {
      console.error('Database error creating appointment:', error);
      return NextResponse.json({ 
        error: error.message,
        details: error.details || 'Database constraint violation',
        hint: error.hint || ''
      }, { status: 400 });
    }

    if (!data || data.length === 0) {
      console.error('No data returned after insert');
      return NextResponse.json({ 
        error: 'Failed to create appointment',
        details: 'No data returned from database' 
      }, { status: 500 });
    }

    console.log('Appointment created successfully:', data[0]);
    return NextResponse.json(data[0], { status: 201 });
  } catch (error: any) {
    console.error('Server error creating appointment:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message || 'Unknown error occurred'
    }, { status: 500 });
  }
}

// Helper function to get a default veterinarian
async function getDefaultVeterinarian(supabase: any): Promise<string> {
  const { data, error } = await supabase
    .from('veterinarian_profiles')
    .select('id')
    .eq('employment_status', 'full_time')
    .limit(1)
    .single();
  
  if (error || !data) {
    // Try without employment status filter
    const { data: anyVet, error: anyError } = await supabase
      .from('veterinarian_profiles')
      .select('id')
      .limit(1)
      .single();
    
    if (anyError || !anyVet) {
      throw new Error('No veterinarian available');
    }
    
    return anyVet.id;
  }
  
  return data.id;
}
