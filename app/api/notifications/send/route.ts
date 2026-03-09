import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const VALID_TYPES = [
  'appointment_reminder',
  'appointment_confirmed',
  'appointment_cancelled',
  'payment_due',
  'general',
  'test_results',
] as const;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      recipient_id,
      notification_type,
      subject,
      content,
      related_entity_type,
      related_entity_id,
    } = body;

    if (!recipient_id || !notification_type || !content) {
      return NextResponse.json(
        { error: 'recipient_id, notification_type, and content are required' },
        { status: 400 },
      );
    }

    if (!VALID_TYPES.includes(notification_type)) {
      return NextResponse.json(
        { error: `Invalid notification_type. Must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from('notification_logs')
      .insert({
        recipient_id,
        notification_type,
        subject: subject ?? null,
        content,
        related_entity_type: related_entity_type ?? null,
        related_entity_id: related_entity_id ?? null,
        is_read: false,
        delivery_status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[POST /api/notifications/send]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('[POST /api/notifications/send] Unexpected:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
