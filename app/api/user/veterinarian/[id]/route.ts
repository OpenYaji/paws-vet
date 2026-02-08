import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;

    // Get auth user first
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (authError || !authUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Try to get from users table
    const { data: userRecord } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    // Get vet profile
    const { data: profile } = await supabaseAdmin
      .from('veterinarian_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!profile) {
      return NextResponse.json({
        user: {
          id: authUser.user.id,
          email: authUser.user.email,
          role: userRecord?.role || 'veterinarian',
          account_status: userRecord?.account_status || 'active',
          created_at: authUser.user.created_at
        },
        profile: null,
        upcomingAppointments: [],
        availability: []
      });
    }

    // Get upcoming appointments
    const { data: appointments } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        pet:pets(name, species, breed),
        client:client_profiles(first_name, last_name)
      `)
      .eq('veterinarian_id', profile.id)
      .gte('scheduled_start', new Date().toISOString())
      .order('scheduled_start', { ascending: true })
      .limit(10);

    // Get availability schedule
    const { data: availability } = await supabaseAdmin
      .from('veterinarian_availability')
      .select('*')
      .eq('veterinarian_id', profile.id)
      .gte('availability_date', new Date().toISOString().split('T')[0])
      .order('availability_date', { ascending: true });

    return NextResponse.json({
      user: {
        id: authUser.user.id,
        email: authUser.user.email,
        role: userRecord?.role || 'veterinarian',
        account_status: userRecord?.account_status || 'active',
        created_at: authUser.user.created_at
      },
      profile,
      upcomingAppointments: appointments || [],
      availability: availability || []
    });
  } catch (error: any) {
    console.error('Error fetching veterinarian details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch veterinarian details', details: error.message },
      { status: 500 }
    );
  }
}
