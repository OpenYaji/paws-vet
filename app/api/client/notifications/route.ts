import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET /api/client/notifications - Fetch user's notifications
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const unreadOnly = searchParams.get('unread_only') === 'true';

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    let query = supabaseAdmin
      .from('notification_logs')
      .select('*', { count: 'exact' })
      .eq('recipient_id', userId);

    // Filter for unread only if requested — uses is_read column (the actual DB field)
    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      notifications: data || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Unexpected error in GET /notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/client/notifications - Create new notification
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

    if (!recipient_id) {
      return NextResponse.json({ error: 'recipient_id is required' }, { status: 400 });
    }
    if (!notification_type) {
      return NextResponse.json({ error: 'notification_type is required' }, { status: 400 });
    }
    if (!content) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    const validTypes = [
  'appointment_reminder',
  'appointment_confirmed',  
  'appointment_cancelled',
  'payment_due',
  'general',
  'test_results',            
];

    if (!validTypes.includes(notification_type)) {
      return NextResponse.json(
        { error: `notification_type must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('notification_logs')
      .insert({
        recipient_id,
        notification_type,
        subject: subject || null,
        content,
        related_entity_type: related_entity_type || null,
        related_entity_id: related_entity_id || null,
        delivery_status: 'pending',
        is_read: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}