import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { type, label, appointmentId, petId } = await req.json();

    console.log('[send-admin] received:', { type, label });

    if (!type || !label) {
      return NextResponse.json(
        { error: 'Missing type or label' },
        { status: 400 }
      );
    }

    const copy: Record<string, { subject: string; content: string; notification_type: string }> = {
      booked: {
        notification_type: 'appointment_booked',
        subject: `Appointment booked — ${label}`,
        content: `Appointment ${label} has been successfully booked and is awaiting confirmation from our team.`,
      },
      pet_added: {
        notification_type: 'pet_added',
        subject: `New pet registered — ${label}`,
        content: `A client has added a new pet "${label}" to their profile. You can view it in the CMS Pet Management tab.`,
      },
      pet_updated: {
        notification_type: 'pet_updated',
        subject: `Pet profile updated — ${label}`,
        content: `A client has updated their pet "${label}"'s profile information.`,
      },
    };

    const payload = copy[type];
    if (!payload) {
      return NextResponse.json(
        { error: 'Unknown notification type: ' + type },
        { status: 400 }
      );
    }

    // Get all admin and vet user IDs
    const { data: staffUsers } = await admin
      .from('users')
      .select('id')
      .in('role', ['admin', 'veterinarian']);

    const recipientIds: string[] = [
      ...(staffUsers ?? []).map((u: any) => u.id),
    ];

    if (!recipientIds.length) {
      return NextResponse.json({ sent: 0, reason: 'no recipients' });
    }

    const rows = recipientIds.map((id) => ({
      recipient_id: id,
      notification_type: payload.notification_type,
      subject: payload.subject,
      content: payload.content,
      is_read: false,
      related_entity_type: appointmentId
        ? 'appointment'
        : petId
        ? 'pet'
        : null,
      related_entity_id: appointmentId || petId || null,
      delivery_status: 'sent',
    }));

    console.log('[send-admin] inserting rows:', rows.length);

    const { error: insertError } = await admin
      .from('notification_logs')
      .insert(rows);

    if (insertError) {
      console.error('[send-admin] insert error:', insertError);
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ sent: rows.length });
  } catch (e: any) {
    console.error('[send-admin] exception:', e);
    return NextResponse.json(
      { error: e.message },
      { status: 500 }
    );
  }
}
