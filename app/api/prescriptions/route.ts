import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(request: NextRequest) {
  try {
    const body = await request.json();
    const { appointment_id, medication_name, pet_id, veterinarian_id } = body;

        // --- STEP 1: VALIDATION (Check if Consultation Exists) ---
        
        if (!appointment_id) {
            return NextResponse.json(
                { error: 'Appointment ID is required to link this prescription.' }, 
                { status: 400 }
            );
        }

        // Check if the appointment exists and has a valid status
        const { data: appointment, error: apptError } = await supabase
            .from('appointments')
            .select('appointment_status')
            .eq('id', appointment_id)
            .single();

        if (apptError || !appointment) {
             return NextResponse.json(
                { error: 'Consultation record not found.' }, 
                { status: 404 }
            );
        }

        // Optional: Enforce that the consultation must be active or finished
        // (Prevent prescribing for 'scheduled' or 'cancelled' appointments)
        const validStatuses = ['in-consultation', 'completed'];
        if (!validStatuses.includes(appointment.appointment_status)) {
            return NextResponse.json(
                { error: `Cannot prescribe. Consultation status is currently: ${appointment.appointment_status}` }, 
                { status: 403 } // Forbidden
            );
        }

        // --- STEP 2: SAVE PRESCRIPTION ---

        const { data, error } = await supabase
            .from('prescriptions')
            .insert([{
                appointment_id,     // Link it to the consultation
                pet_id,
                veterinarian_id,
                medication_name,
                dosage: body.dosage,
                frequency: body.frequency,
                duration: body.duration,
                instructions: body.instructions,
                status: 'pending'   // Default status
            }])
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || !body.owner_id || !body.species) {
      return NextResponse.json(
        { error: 'Missing required fields: name, owner_id, species' },
        { status: 400 }
      );
    }

    const newPet = {
      name: body.name,
      species: body.species,
      breed: body.breed,
      color: body.color,
      weight: body.weight,
      owner_id: body.owner_id,
      image_url: body.image_url,
    };

    const { data, error } = await supabase
        .from('prescriptions')
        .insert([body]).select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
    const { data: { user }} = await supabase.auth.getUser();

    if(user?.user_metadata.role !== 'veterinarian'){
        return NextResponse.json({ error: 'Unauthorized, Vets only' }, { status: 403 });
    }

    try{
        const searchParams = new URL(request.url).searchParams;
        const id = searchParams.get('id');

        if(!id){
        return NextResponse.json({ error: 'Prescription ID is required' }, { status: 400 });
        }

        const { error } = await supabase.from('prescriptions').delete().eq('id', id);

        if(error){
        return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ message: 'Prescription deleted successfully' }, { status: 200 });
    }
    catch(err){
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function UPDATE(request: NextRequest) {
    const { data: { user }} = await supabase.auth.getUser();
}