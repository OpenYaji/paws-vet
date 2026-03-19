import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function getAuthUser(request: NextRequest) {
  const supabase = await createClient();
  const authHeader = request.headers.get('Authorization');
  const token = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
  const { data: { user }, error } = token
    ? await supabase.auth.getUser(token)
    : await supabase.auth.getUser();
  return { user: error ? null : user };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const petId = searchParams.get('pet_id');

    let query = adminSupabase
      .from('medical_records')
      .select(`
        *,
        appointments (id, appointment_number, scheduled_start, reason_for_visit),
        pets (id, name, species),
        veterinarian:veterinarian_profiles!medical_records_veterinarian_id_fkey (id, first_name, last_name)
      `)
      .order('visit_date', { ascending: false });

    if (petId) query = query.eq('pet_id', petId);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data || []);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthUser(request);
    if (!user || user.user_metadata?.role !== 'veterinarian') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const [insertResult, auditResult] = await Promise.all([
      adminSupabase.from('medical_records').insert([body]).select(),
      adminSupabase.from('audit_logs').insert({
        user_id: user.id,
        action_type: 'create',
        table_name: 'medical_records',
        details: `Created medical record for pet_id ${body.pet_id}, appointment_id ${body.appointment_id}`,
      }),
    ]);
    if (insertResult.error) return NextResponse.json({ error: insertResult.error.message }, { status: 400 });
    if (auditResult.error) throw auditResult.error;
    return NextResponse.json(insertResult.data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user } = await getAuthUser(request);
    if (!user || user.user_metadata?.role !== 'veterinarian') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    // Only allow editing clinical fields
    const allowed = ['chief_complaint', 'diagnosis', 'treatment_plan', 'assessment', 'plan', 'notes'];
    const patch: Record<string, any> = {};
    for (const key of allowed) {
      if (key in updates) patch[key] = updates[key];
    }

    const { data: oldRecord } = await adminSupabase.from('medical_records').select().eq('id', id).single();

    const [updateResult, auditResult] = await Promise.all([
      adminSupabase.from('medical_records').update(patch).eq('id', id).select().single(),
      adminSupabase.from('audit_logs').insert({
        user_id: user.id,
        action_type: 'update',
        table_name: 'medical_records',
        details: `Updated medical record id ${id}`,
        old_values: oldRecord ?? null,
        new_values: patch,
      }),
    ]);

    if (updateResult.error) return NextResponse.json({ error: updateResult.error.message }, { status: 400 });
    if (auditResult.error) throw auditResult.error;
    return NextResponse.json(updateResult.data);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
