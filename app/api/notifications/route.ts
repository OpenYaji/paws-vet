// app/api/notifications/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// GET: Fetch notifications for a user
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('notification_logs')
      .select('*')
      .eq('recipient_id', userId)
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json([], { status: 200 });
    }

    return NextResponse.json(data || []);

  } catch (error) {
    console.error('Notifications API error:', error);
    return NextResponse.json([], { status: 200 });
  }
}

// POST: Create a new notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recipient_id, notification_type, subject, content, related_entity_type, related_entity_id } = body;

    if (!recipient_id || !notification_type || !content) {
      return NextResponse.json(
        { error: 'Recipient ID, notification type, and content are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('notification_logs')
      .insert({
        recipient_id,
        notification_type,
        subject,
        content,
        related_entity_type,
        related_entity_id,
        delivery_status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Create notification error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create notification' }, { status: 500 });
  }
}

// PATCH: Mark notification as delivered/read
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { notification_id, delivery_status } = body;

    if (!notification_id) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    const updateData: any = {
      delivery_status: delivery_status || 'delivered',
    };

    if (delivery_status === 'delivered') {
      updateData.delivered_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('notification_logs')
      .update(updateData)
      .eq('id', notification_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating notification:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Update notification error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update notification' }, { status: 500 });
  }
}
