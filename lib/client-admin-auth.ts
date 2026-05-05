import { NextResponse } from 'next/server';
import { createClient as createAdminClient, type User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export type ClientAdminAuthResult =
  | { user: User; response: null }
  | { user: null; response: NextResponse };

export async function requireClientAdmin(request: Request): Promise<ClientAdminAuthResult> {
  const supabase = await createClient();
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '').trim();

  const {
    data: { user },
    error,
  } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser();

  if (error || !user) {
    return {
      user: null,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const metadataRole =
    user.user_metadata?.role?.toLowerCase?.() ||
    user.app_metadata?.role?.toLowerCase?.();

  if (metadataRole === 'admin') {
    return { user, response: null };
  }

  const { data: adminProfile, error: profileError } = await supabaseAdmin
    .from('admin_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('[client-admin-auth] admin profile lookup failed:', profileError);
  }

  if (!adminProfile?.id) {
    return {
      user: null,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { user, response: null };
}
