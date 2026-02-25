import { NextResponse } from 'next/server';
// Use the exact path to your server client file
import { createCookieClient } from '@/lib/supabase-server'; 

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createCookieClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch profile name
    const { data: profile } = await supabase
      .from('veterinarian_profiles')
      .select('first_name, last_name')
      .eq('user_id', user.id)
      .maybeSingle();

    // 2. Fetch today's appointments
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const { count: todayCount } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('veterinarian_id', user.id)
      .gte('scheduled_start', startOfToday.toISOString())
      .lte('scheduled_start', endOfToday.toISOString());

    // 3. Fetch total patients
    const { count: patientsCount } = await supabase
      .from('pets')
      .select('*', { count: 'exact', head: true });

    // 4. Fetch pending appointments
    const { count: pendingCount } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('veterinarian_id', user.id)
      .eq('appointment_status', 'pending');

    return NextResponse.json({
      firstName: profile?.first_name || 'Doc',
      lastName: profile?.last_name || '',
      todayAppointments: todayCount || 0,
      totalPatients: patientsCount || 0,
      pendingAppointments: pendingCount || 0,
    });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}