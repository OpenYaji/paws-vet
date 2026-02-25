import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// PATCH /api/client/notifications/mark-read - Mark notification as read/unread
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { notification_id, is_read } = body;

    if (!notification_id) {
      return NextResponse.json({ error: 'notification_id is required' }, { status: 400 });
    }
    if (typeof is_read !== 'boolean') {
      return NextResponse.json({ error: 'is_read must be true or false' }, { status: 400 });
    }

    // Update the is_read boolean — the actual read-tracking column in the DB
    const { data, error } = await supabaseAdmin
      .from('notification_logs')
      .update({ is_read })
      .eq('id', notification_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating notification:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error in PATCH /mark-read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}