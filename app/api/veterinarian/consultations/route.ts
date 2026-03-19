import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { handleError } from '@/utils/error-handler';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  try {
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
        pets (
          id,
          name,
          species,
          breed,
          date_of_birth,
          weight,
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

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  try {
    // Request validation and authentication
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
    const medicalRecord = supabase
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
    
    const apptTypeQuery = supabase
      .from('appointments')
      .select('appointment_type')
      .eq('id', appointment_id)
      .single();

    const [ medicalResult, appointmentTypeResult ] = await Promise.all([
      medicalRecord,
      apptTypeQuery,
    ]);

    const appointmentType = appointmentTypeResult.data?.appointment_type?.toLowerCase?.() || '';
    const isKapon = appointmentType === 'kapon' || appointmentType === 'surgery';
    const nextStatus = isKapon ? 'in_progress' : 'completed';

    if (medicalResult.error) return handleError(medicalResult.error, 'Failed to insert medical record');
    if (appointmentTypeResult.error) return handleError(appointmentTypeResult.error, 'Failed to fetch appointment type');

    const appointmentUpdateResult = await supabase
      .from('appointments')
      .update({ appointment_status: nextStatus })
      .eq('id', appointment_id);
    
    if (appointmentUpdateResult.error) return handleError(appointmentUpdateResult.error, 'Failed to update appointment status');

    return NextResponse.json({ 
      success: true,
      message: isKapon
        ? 'Consultation saved. Patient is now queued for Kapon / Neuter procedure.'
        : 'Consultation completed successfully. Prescriptions are now unlocked.',
      medical_record_id: medicalResult.data?.id,
      record_number: recordNumber,
      next_step: isKapon ? 'neuter' : 'done',
    });

  } catch (error: any) {
    // Unexpected JS/DB error — centralized handler
    return handleError(error, 'POST /api/veterinarian/consultations');
  }
}
