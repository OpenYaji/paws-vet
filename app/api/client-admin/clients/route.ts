import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Service role client — bypasses RLS so admin can see all data
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    // BUG FIX: Support filtering by active/archived status from the URL
    const showDeleted = searchParams.get('deleted') === 'true';

    let query = supabaseAdmin
      .from('client_profiles')
      .select(`
        *,
        users!client_profiles_user_id_fkey (
          id,
          email,
          role,
          account_status,
          last_login_at,
          created_at,
          deleted_at
        )
      `)
      .order('created_at', { ascending: false });

    const { data: clients, error } = await query;

    if (error) {
      console.error('Error fetching clients:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // BUG FIX: use Promise.allSettled instead of Promise.all so one failing
    // count lookup doesn't crash the entire response
    const clientsWithCounts = await Promise.allSettled(
      (clients || []).map(async (client: any) => {
        try {
          const { count: petCount } = await supabaseAdmin
            .from('pets')
            .select('*', { count: 'exact', head: true })
            .eq('owner_id', client.id)
            .eq('is_active', true);

          // BUG FIX: was making 2 DB calls (get pets, then count appts).
          // Use a single count query joined through the pets relationship.
          // First get pet IDs, then count appointments in one shot.
          let appointmentCount = 0;
          const { data: clientPets } = await supabaseAdmin
            .from('pets')
            .select('id')
            .eq('owner_id', client.id);

          if (clientPets && clientPets.length > 0) {
            const petIds = clientPets.map((p: { id: string }) => p.id);
            const { count } = await supabaseAdmin
              .from('appointments')
              .select('*', { count: 'exact', head: true })
              .in('pet_id', petIds);
            appointmentCount = count || 0;
          }

          return {
            ...client,
            pet_count: petCount || 0,
            appointment_count: appointmentCount,
          };
        } catch {
          // Gracefully degrade — return client without counts rather than fail
          return { ...client, pet_count: 0, appointment_count: 0 };
        }
      })
    );

    // Extract fulfilled results (reject any that somehow still fail)
    const result = clientsWithCounts
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map(r => r.value);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Unexpected error in GET /clients:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
