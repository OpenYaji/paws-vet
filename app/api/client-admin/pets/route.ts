import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get('owner_id');
    // BUG FIX: Added pagination to prevent unbounded queries
    const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 1000);
    const offset = parseInt(searchParams.get('offset') || '0');
    // BUG FIX: Added optional filter to include/exclude archived pets
    const includeArchived = searchParams.get('include_archived') === 'true';

    let query = supabaseAdmin
      .from('pets')
      .select(`
        *,
        client_profiles!pets_owner_id_fkey (
          id, first_name, last_name, phone
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (ownerId) {
      query = query.eq('owner_id', ownerId);
    }

    // BUG FIX: Exclude soft-deleted (archived) pets by default
    if (!includeArchived) {
      query = query.is('deleted_at', null);
    }

    const { data: pets, error } = await query;

    if (error) {
      console.error('Error fetching pets:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(pets || []);
  } catch (error) {
    console.error('Unexpected error in GET /pets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
