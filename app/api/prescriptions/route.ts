import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { se } from 'date-fns/locale';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

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

      if (authError || !user || user.user_metadata.role !== 'veterinarian') {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const body = await request.json();
      const { appointment_id, medication_name, pet_id, veterinarian_id } = body;
      
      const { searchParams } = new URL(request.url);
      const search = searchParams.get('search');

      let query = supabase
        .from('pets')
        .select('id, name, species, client_profiles(first_name, last_name)')
        .order('name');

      if(search){
        query = query.ilike('name', `%${search}%`);
      }

      const { data: petsData, error: petsError } = await query.limit(10);
    
      if (petsError) {
        return NextResponse.json({ error: petsError.message }, { status: 400 });
      }
        
      return NextResponse.json(petsData, { status: 200 });
    }
  catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
    
export async function POST(request: NextRequest) {
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
              } catch (error) {
                console.error('Error setting cookies:', error);
              }
            },
          },
        }
      );
    
        const { data: { user }, error: authError } = await authClient.auth.getUser();
    
        if (authError || !user || user.user_metadata.role !== 'veterinarian') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    
        const body = await request.json();
        const { appointment_id, medication_name, pet_id, veterinarian_id } = body;
    
        if (!appointment_id) {
            return NextResponse.json(
                { error: 'Appointment ID is required to link this prescription.' }, 
                { status: 400 }
            );
        }

        const { data: appointment, error: apptError } = await supabase
            .from('appointments')
            .select('appointment_status')
            .eq('id', appointment_id)
            .single();

        if (apptError) {
             return NextResponse.json(
                { error: 'Consultation record not found.' }, 
                { status: 404 }
            );
        }

        if (!appointment) {
             return NextResponse.json(
                { error: 'Consultation record not found.' }, 
                { status: 404 }
            );
        }

        const validStatuses = ['in-consultation', 'completed'];
        if (appointment && !validStatuses.includes(appointment.appointment_status)) {
            return NextResponse.json(
                { error: `Cannot prescribe. Consultation status is currently: ${appointment.appointment_status}` }, 
                { status: 403 }
            );
        }

        const fetchPets = await supabase
          .from('pets')
          .select('id, name, species, client_profiles(last_name)')
          .order('name')
          .limit(10);

          if (fetchPets.error) {
            return NextResponse.json({ error: fetchPets.error.message }, { status: 400 });
          }

        const { data: prescriptionData, error: prescriptionError } = await supabase
            .from('prescriptions')
            .insert([{
                appointment_id,
                pet_id,
                veterinarian_id,
                medication_name,
                dosage: body.dosage,
                frequency: body.frequency,
                duration: body.duration,
                instructions: body.instructions,
                status: 'pending' 
            }])
            .select()
            .single();

        if (prescriptionError) {
            return NextResponse.json({ error: prescriptionError.message }, { status: 400 });
        }

        return NextResponse.json(prescriptionData, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
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
    
        if (authError || !user || user.user_metadata.role !== 'veterinarian') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
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
    try{
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

        if (authError || !user || user.user_metadata.role !== 'veterinarian') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
    }
    catch(error: any){
      return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 });
    }
}