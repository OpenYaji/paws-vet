import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      urlValue: supabaseUrl ? supabaseUrl.substring(0, 20) + '...' : 'missing',
      keyPrefix: supabaseServiceKey ? supabaseServiceKey.substring(0, 10) + '...' : 'missing'
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables');
      return NextResponse.json(
        { 
          error: 'Server configuration error',
          details: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
        },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      }
    });

    console.log('Attempting to fetch auth users...');

    // Get all auth users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { 
          error: 'Failed to fetch auth users',
          details: authError.message 
        },
        { status: 500 }
      );
    }

    console.log('Auth users found:', authData.users.length);

    // Check if users table exists and has role information
    const { data: usersTable } = await supabaseAdmin
      .from('users')
      .select('id, role');

    // Fetch all profile tables
    console.log('Fetching client profiles...');
    const { data: clientProfiles } = await supabaseAdmin
      .from('client_profiles')
      .select('*');
    
    console.log('Fetching vet profiles...');
    const { data: vetProfiles } = await supabaseAdmin
      .from('veterinarian_profiles')
      .select('*');
    
    console.log('Fetching admin profiles...');
    const { data: adminProfiles } = await supabaseAdmin
      .from('admin_profiles')
      .select('*');

    console.log('Profiles found:', {
      usersTable: usersTable?.length || 0,
      clients: clientProfiles?.length || 0,
      vets: vetProfiles?.length || 0,
      admins: adminProfiles?.length || 0
    });

    // Map auth users with their profiles
    const combinedUsers = authData.users.map(authUser => {
      let full_name = 'N/A';
      let phone = 'N/A';
      let address = '';
      let role = 'unknown';

      // First check if role is stored in users table
      const userRecord = usersTable?.find(u => u.id === authUser.id);
      if (userRecord?.role) {
        role = userRecord.role;
      }

      // Check client profiles
      const clientProfile = clientProfiles?.find(p => p.user_id === authUser.id);
      if (clientProfile) {
        role = 'client';
        full_name = `${clientProfile.first_name} ${clientProfile.last_name}`;
        phone = clientProfile.phone || 'N/A';
        address = clientProfile.address_line1 ? 
          `${clientProfile.address_line1}, ${clientProfile.city}, ${clientProfile.state}` : '';
      }

      // Check vet profiles
      const vetProfile = vetProfiles?.find(p => p.user_id === authUser.id);
      if (vetProfile) {
        role = 'veterinarian';
        full_name = `${vetProfile.first_name} ${vetProfile.last_name}`;
        phone = vetProfile.phone || 'N/A';
      }

      // Check admin profiles
      const adminProfile = adminProfiles?.find(p => p.user_id === authUser.id);
      if (adminProfile) {
        role = 'admin';
        full_name = `${adminProfile.first_name} ${adminProfile.last_name}`;
        phone = adminProfile.phone || 'N/A';
      }

      // If still unknown, check user metadata or default to client
      if (role === 'unknown') {
        role = authUser.user_metadata?.role || authUser.app_metadata?.role || 'client';
      }

      return {
        id: authUser.id,
        email: authUser.email || 'N/A',
        role: role,
        account_status: authUser.banned_until ? 'suspended' : 'active',
        email_verified: authUser.email_confirmed_at ? true : false,
        last_login_at: authUser.last_sign_in_at,
        created_at: authUser.created_at,
        full_name,
        phone,
        address
      };
    });

    console.log('Successfully combined users:', combinedUsers.length);
    console.log('Role distribution:', combinedUsers.reduce((acc: any, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {}));

    return NextResponse.json(combinedUsers);
  } catch (error: any) {
    console.error('Unexpected error in /api/user:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return NextResponse.json(
      { 
        error: 'Failed to fetch users',
        details: error.message,
        type: error.name
      },
      { status: 500 }
    );
  }
}
