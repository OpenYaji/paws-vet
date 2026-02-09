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
      console.error('Auth user not found:', authError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Try to get from users table (might not exist)
    const { data: userRecord } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    // Get client profile
    const { data: profile } = await supabaseAdmin
      .from('client_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!profile) {
      console.log('No client profile found for user:', userId);
      // Return minimal data if no profile exists
      return NextResponse.json({
        user: {
          id: authUser.user.id,
          email: authUser.user.email,
          role: userRecord?.role || 'client',
          account_status: userRecord?.account_status || 'active',
          created_at: authUser.user.created_at
        },
        profile: null,
        pets: [],
        emergencyContacts: [],
        recentAppointments: []
      });
    }

    // Get pets owned by this client
    const { data: pets } = await supabaseAdmin
      .from('pets')
      .select('*')
      .eq('owner_id', profile.id)
      .eq('is_active', true);

    // Get emergency contacts
    const { data: emergencyContacts } = await supabaseAdmin
      .from('emergency_contacts')
      .select('*')
      .eq('client_id', profile.id);

    // Get recent appointments through pets
    const petIds = pets?.map(p => p.id) || [];
    let appointments = [];
    
    if (petIds.length > 0) {
      const { data: appointmentsData } = await supabaseAdmin
        .from('appointments')
        .select(`
          *,
          veterinarian:veterinarian_profiles(first_name, last_name)
        `)
        .in('pet_id', petIds)
        .order('scheduled_start', { ascending: false })
        .limit(5);
      
      appointments = appointmentsData || [];
    }

    return NextResponse.json({
      user: {
        id: authUser.user.id,
        email: authUser.user.email,
        role: userRecord?.role || 'client',
        account_status: userRecord?.account_status || 'active',
        created_at: authUser.user.created_at
      },
      profile,
      pets: pets || [],
      emergencyContacts: emergencyContacts || [],
      recentAppointments: appointments
    });
  } catch (error: any) {
    console.error('Error fetching client details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client details', details: error.message },
      { status: 500 }
    );
  }
}
