import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { requireClientAdmin } from '@/lib/client-admin-auth';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireClientAdmin(req);
    if (auth.response) return auth.response;

    const { id: clientId } = await context.params;
    const body = await req.json();
    const { account_status, archived } = body;

    console.log('[status PATCH] clientId:', clientId, 'body:', body);

    if (!clientId) {
      return NextResponse.json(
        { error: 'Missing client ID' }, { status: 400 }
      );
    }

    // Try lookup by client_profiles.id first
    let userId: string | null = null;

    const { data: profile, error: profileError } = await admin
      .from('client_profiles')
      .select('user_id')
      .eq('id', clientId)
      .maybeSingle();

    if (profileError) {
      console.error('[status PATCH] profile lookup error:', profileError);
    }

    if (profile?.user_id) {
      userId = profile.user_id;
    } else {
      // Fallback: maybe clientId IS the user_id
      const { data: userCheck } = await admin
        .from('users')
        .select('id')
        .eq('id', clientId)
        .maybeSingle();
      if (userCheck?.id) userId = userCheck.id;
    }

    if (!userId) {
      console.error('[status PATCH] no user found for clientId:', clientId);
      return NextResponse.json(
        { error: 'Client not found', clientId }, { status: 404 }
      );
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (archived === true) {
      updatePayload.deleted_at = new Date().toISOString();
      updatePayload.account_status = 'inactive';
    } else if (archived === false) {
      updatePayload.deleted_at = null;
      updatePayload.account_status = account_status || 'active';
    } else if (account_status) {
      updatePayload.account_status = account_status;
    }

    console.log('[status PATCH] updating userId:', userId, 'payload:', updatePayload);

    const { error: updateError } = await admin
      .from('users')
      .update(updatePayload)
      .eq('id', userId);

    if (updateError) {
      console.error('[status PATCH] update error:', updateError);
      return NextResponse.json(
        { error: updateError.message }, { status: 500 }
      );
    }

    return NextResponse.json({ success: true, userId });
  } catch (e: any) {
    console.error('[status PATCH] exception:', e);
    return NextResponse.json(
      { error: e.message }, { status: 500 }
    );
  }
}
