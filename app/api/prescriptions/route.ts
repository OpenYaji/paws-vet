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
      
      const { searchParams } = new URL(request.url);
      const search = searchParams.get('search');

      let query = supabase
        .from('prescriptions')
        .select(`
          *,
          medical_record:medical_records!prescriptions_medical_record_id_fkey (
            id,
            record_number,
            visit_date,
            chief_complaint,
            appointment_id,
            pet_id
          ),
          prescribed_by_vet:veterinarian_profiles!prescriptions_prescribed_by_fkey (
            id,
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false });

      const { data: prescriptionsData, error: prescriptionsError } = await query;
    
      if (prescriptionsError) {
        console.error('Prescriptions fetch error:', prescriptionsError);
        return NextResponse.json({ error: prescriptionsError.message }, { status: 400 });
      }

      // Fetch pet data for each prescription
      const prescriptionsWithPets = await Promise.all(
        (prescriptionsData || []).map(async (prescription: any) => {
          const { data: pet } = await supabase
            .from('pets')
            .select(`
              id,
              name,
              species,
              breed,
              owners:client_profiles!pets_owner_id_fkey (
                id,
                first_name,
                last_name,
                phone
              )
            `)
            .eq('id', prescription.medical_record?.pet_id)
            .single();

          return {
            ...prescription,
            pets: pet
          };
        })
      );
        
      return NextResponse.json(prescriptionsWithPets, { status: 200 });
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
      const { medical_record_id, prescribed_by, medication_name } = body;
    
      if (!medical_record_id) {
        return NextResponse.json(
          { error: 'Medical Record ID is required to link this prescription.' }, 
          { status: 400 }
        );
      }

      if (!prescribed_by) {
        return NextResponse.json(
          { error: 'Prescribed by (veterinarian ID) is required.' }, 
          { status: 400 }
        );
      }

      // Verify the medical record exists
      const { data: medicalRecord, error: recordError } = await supabase
        .from('medical_records')
        .select('id, pet_id')
        .eq('id', medical_record_id)
        .single();

      if (recordError || !medicalRecord) {
        return NextResponse.json(
          { error: 'Medical record not found.' }, 
          { status: 404 }
        );
      }

      const { data: prescriptionData, error: prescriptionError } = await supabase
        .from('prescriptions')
        .insert([{
          medical_record_id,
          prescribed_by,
          medication_name,
          dosage: body.dosage,
          frequency: body.frequency,
          duration: body.duration,
          instructions: body.instructions,
          form: body.form || null,
          quantity: body.quantity || null,
          refills_allowed: body.refills_allowed || 0,
          is_controlled_substance: body.is_controlled_substance || false
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