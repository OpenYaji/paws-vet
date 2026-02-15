import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// 1. Initialize Supabase with SERVICE ROLE KEY (Bypasses RLS policies)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// --- GET: Fetch "Waiting Room" (Checked-In Patients) ---
export async function GET(request: NextRequest) {
  try {
    // We want appointments for TODAY that are 'Checked In'
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_number,
        scheduled_start,
        status,
        reason_for_visit, 
        pets (
          id,
          name,
          species,
          breed,
          image_url,
          weight,
          color
        ),
        client_profiles (
          first_name,
          last_name
        )
      `)
      // You can adjust this filter based on your exact status names
      // e.g., 'Checked In', 'Arrived', or just fetch all 'Pending' for today
      .eq('appointment_status', 'checked_in') 
      .gte('scheduled_start', `${today}T00:00:00`)
      .lte('scheduled_start', `${today}T23:59:59`)
      .order('scheduled_start', { ascending: true });

    if (error) {
      console.error('Error fetching waiting room:', error);
      return NextResponse.json([], { status: 200 }); // Return empty array instead of error
    }

    return NextResponse.json(data || []); // Ensure we always return an array

  } catch (error) {
    console.error('Triage API error:', error);
    return NextResponse.json([], { status: 200 }); // Return empty array on catch
  }
}

// --- POST: Save Vitals & Update Status ---
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appointment_id, pet_id, weight, temperature, heart_rate, notes } = body;

    // Validation
    if (!appointment_id || !pet_id) {
      return NextResponse.json({ error: 'Appointment ID and Pet ID are required' }, { status: 400 });
    }

    // 1. Update Pet's Weight (Permanent Record)
    if (weight) {
      const { error: petError } = await supabase
        .from('pets')
        .update({ weight: weight })
        .eq('id', pet_id);

      if (petError) throw petError;
    }

    // 2. Update Appointment Status (Move out of Waiting Room)
    // We also save the triage notes here (assuming you have a 'notes' or 'triage_notes' column)
    // If you don't have a 'triage_notes' column, you can create one or skip that part.
    const { data, error: apptError } = await supabase
      .from('appointments')
      .update({ 
        appointment_status: 'in_progress', // Move them to the next stage
        // triage_notes: `Temp: ${temperature}, HR: ${heart_rate}. ${notes}`, // Optional: Save vitals string
      })
      .eq('id', appointment_id)
      .select();

    if (apptError) throw apptError;

    /* OPTIONAL: If you have a separate 'medical_records' table, 
       you would INSERT the vitals there instead of updating the appointment.
    */

    return NextResponse.json({ success: true, message: 'Triage completed' });

  } catch (error: any) {
    console.error('Triage save error:', error);
    return NextResponse.json({ error: error.message || 'Failed to save triage' }, { status: 500 });
  }
}