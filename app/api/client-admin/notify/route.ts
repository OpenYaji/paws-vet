// app/api/client-admin/notify/route.ts
// Sends notifications to all CMS admin users when clients perform actions
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event_type, subject, content, related_entity_type, related_entity_id } = body;

    if (!event_type || !subject || !content) {
      return NextResponse.json(
        { error: 'event_type, subject, and content are required' },
        { status: 400 },
      );
    }

    // Find all admin user_ids
    const { data: admins, error: adminErr } = await supabaseAdmin
      .from('admin_profiles')
      .select('user_id');

    if (adminErr || !admins?.length) {
      console.error('[notify-cms] Failed to fetch admins:', adminErr);
      return NextResponse.json({ sent: 0 });
    }

    // Map event_type to a notification_type that fits the DB enum
    const typeMap: Record<string, string> = {
      new_appointment: 'new_appointment',
      new_pet: 'new_pet',
    };
    const notification_type = typeMap[event_type] || 'general';

    // Insert a notification for each admin
    const rows = admins.map((a) => ({
      recipient_id: a.user_id,
      notification_type,
      subject,
      content,
      related_entity_type: related_entity_type || null,
      related_entity_id: related_entity_id || null,
      is_read: false,
      delivery_status: 'pending',
    }));

    const { error: insertErr } = await supabaseAdmin
      .from('notification_logs')
      .insert(rows);

    if (insertErr) {
      console.error('[notify-cms] Insert error:', insertErr);
      return NextResponse.json({ error: 'Failed to send notifications' }, { status: 500 });
    }

    return NextResponse.json({ sent: rows.length });
  } catch (err: any) {
    console.error('[notify-cms] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
