import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    const { error } = await admin
      .from('notification_logs')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .in('notification_type', [
        'appointment_booked',
        'pet_added',
        'pet_updated',
        'new_appointment',
        'new_pet',
      ])
      .eq('is_read', false);

    if (error) {
      return NextResponse.json(
        { error: error.message }, { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message }, { status: 500 }
    );
  }
}
