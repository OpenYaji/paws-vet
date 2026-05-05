import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { requireClientAdmin } from '@/lib/client-admin-auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// PATCH /api/client-admin/appointments/[appointmentId]/reschedule
// Body: { new_scheduled_start: string, new_scheduled_end: string }
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ appointmentId: string }> },
) {
  try {
    const auth = await requireClientAdmin(request);
    if (auth.response) return auth.response;

    const { appointmentId } = await params;

    if (!appointmentId) {
      return NextResponse.json({ error: 'appointmentId is required' }, { status: 400 });
    }

    const body = await request.json();
    const { new_scheduled_start, new_scheduled_end } = body;

    if (!new_scheduled_start || !new_scheduled_end) {
      return NextResponse.json(
        { error: 'new_scheduled_start and new_scheduled_end are required' },
        { status: 400 },
      );
    }

    const start = new Date(new_scheduled_start);
    const end = new Date(new_scheduled_end);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    if (end <= start) {
      return NextResponse.json(
        { error: 'scheduled_end must be after scheduled_start' },
        { status: 400 },
      );
    }

    // Fetch current appointment to return old dates
    const { data: current, error: fetchErr } = await supabaseAdmin
      .from('appointments')
      .select('id, scheduled_start, scheduled_end')
      .eq('id', appointmentId)
      .single();

    if (fetchErr || !current) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from('appointments')
      .update({
        scheduled_start: start.toISOString(),
        scheduled_end: end.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointmentId)
      .select()
      .single();

    if (error) {
      console.error('[PATCH /reschedule]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ...data,
      old_scheduled_start: current.scheduled_start,
    });
  } catch (err) {
    console.error('[PATCH /reschedule] Unexpected:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
