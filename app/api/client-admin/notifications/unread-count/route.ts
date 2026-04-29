import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { count, error } = await admin
      .from('notification_logs')
      .select('id', { count: 'exact', head: true })
      .in('notification_type', [
        'appointment_booked',
        'pet_added',
        'pet_updated',
        'new_appointment',
        'new_pet',
      ])
      .eq('is_read', false);

    if (error) {
      return NextResponse.json({ count: 0 });
    }

    return NextResponse.json({ count: count ?? 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
