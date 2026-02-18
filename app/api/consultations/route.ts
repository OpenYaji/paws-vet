import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/auth-helpers-nextjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// --- GET: Fetch appointments that have been triaged and are ready for consultation ---
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => 
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    );
    
    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if(authError || !user || user.user_metadata.role !== 'veterinarian') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date().toISOString().split('T')[0];

    // Get appointments that are in_progress AND have a triage record (checked in today)
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_number,
        scheduled_start,
        checked_in_at,
        appointment_status,
        reason_for_visit,
        pets (
          id,
          name,
          species,
          breed,
          gender,
          date_of_birth,
          photo_url,
          weight,
          color,
          client_profiles!pets_owner_id_fkey (
            first_name,
            last_name,
            phone
          )
        ),
        triage_records (
          id,
          weight,
          temperature,
          heart_rate,
          respiratory_rate,
          mucous_membrane,
          triage_level,
          chief_complaint,
          created_at
        )
      `)
      .eq('appointment_status', 'in_progress')
      .gte('checked_in_at', `${today}T00:00:00`)
      .lte('checked_in_at', `${today}T23:59:59`)
      .not('triage_records', 'is', null) // Only show appointments that have been triaged
      .order('checked_in_at', { ascending: true });

    if (error) {
      console.error('Error fetching consultation queue:', error);
      return NextResponse.json([], { status: 200 });
    }

    // Filter out any appointments that already have a medical record
    const appointmentsWithMedicalRecord = await supabase
      .from('medical_records')
      .select('appointment_id')
      .in('appointment_id', (data || []).map(a => a.id));

    const completedAppointmentIds = new Set(
      (appointmentsWithMedicalRecord.data || []).map(r => r.appointment_id)
    );

    const filteredData = (data || []).filter(
      appt => !completedAppointmentIds.has(appt.id) && appt.triage_records && appt.triage_records.length > 0
    );

    return NextResponse.json(filteredData || []);

  } catch (error) {
    console.error('Consultation API error:', error);
    return NextResponse.json([], { status: 200 });
  }
}

// --- POST: Save consultation/medical record ---
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      appointment_id,
      pet_id,
      veterinarian_id,
      subjective,
      objective,
      assessment,
      plan
    } = body;

    // Validation
    if (!appointment_id || !pet_id || !veterinarian_id) {
      return NextResponse.json({ 
        error: 'Missing required fields: appointment_id, pet_id, veterinarian_id' 
      }, { status: 400 });
    }

    if (!assessment) {
      return NextResponse.json({ 
        error: 'Assessment (diagnosis) is required' 
      }, { status: 400 });
    }

    // Generate record number
    const recordNumber = `MR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Insert medical record
    const { data: medicalRecord, error: recordError } = await supabase
      .from('medical_records')
      .insert({
        record_number: recordNumber,
        appointment_id,
        pet_id,
        veterinarian_id,
        visit_date: new Date().toISOString().split('T')[0],
        chief_complaint: subjective || '',
        examination_findings: objective || '',
        diagnosis: assessment,
        treatment_plan: plan || '',
        record_created_by: veterinarian_id
      })
      .select()
      .single();

    if (recordError) {
      console.error('Error creating medical record:', recordError);
      throw new Error(recordError.message);
    }

    // Update appointment status to completed
    const { error: appointmentError } = await supabase
      .from('appointments')
      .update({ appointment_status: 'completed' })
      .eq('id', appointment_id);

    if (appointmentError) {
      console.error('Error updating appointment:', appointmentError);
      // Don't throw - medical record was created successfully
    }

    return NextResponse.json({ 
      success: true,
      message: 'Consultation completed successfully. Prescriptions are now unlocked.',
      medical_record_id: medicalRecord.id,
      record_number: recordNumber
    });

  } catch (error: any) {
    console.error('Consultation save error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to save consultation' 
    }, { status: 500 });
  }
}
