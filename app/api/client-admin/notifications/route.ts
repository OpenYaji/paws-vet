import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_NOTIF_TYPES = [
  'appointment_booked',
  'pet_added',
  'pet_updated',
  'new_appointment',
  'new_pet',
];

export async function GET() {
  try {
    const { data, error } = await admin
      .from('notification_logs')
      .select('*')
      .in('notification_type', ADMIN_NOTIF_TYPES)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message }, { status: 500 }
      );
    }

    // Deduplicate by related_entity_id + type
    // so same booking doesn't appear once per admin
    const seen = new Set<string>();
    const deduped = (data ?? []).filter((row: any) => {
      const key = `${row.notification_type}:${
        row.related_entity_id ?? row.id
      }`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json(deduped);
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message }, { status: 500 }
    );
  }
}
