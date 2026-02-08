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

    // Get admin profile
    const { data: profile } = await supabaseAdmin
      .from('admin_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!profile) {
      return NextResponse.json({
        user: {
          id: authUser.user.id,
          email: authUser.user.email,
          role: userRecord?.role || 'admin',
          account_status: userRecord?.account_status || 'active',
          created_at: authUser.user.created_at
        },
        profile: null,
        recentActivity: []
      });
    }

    // Get recent activity logs
    const { data: auditLogs } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      user: {
        id: authUser.user.id,
        email: authUser.user.email,
        role: userRecord?.role || 'admin',
        account_status: userRecord?.account_status || 'active',
        created_at: authUser.user.created_at
      },
      profile,
      recentActivity: auditLogs || []
    });
  } catch (error: any) {
    console.error('Error fetching admin details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin details', details: error.message },
      { status: 500 }
    );
  }
}
