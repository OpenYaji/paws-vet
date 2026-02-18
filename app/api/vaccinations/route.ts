import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/auth-helpers-nextjs';

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

    const [petsResult, vaccinationHistoryResult] = await Promise.all([
       supabase
        .from('pets')
        .select('id, name, species, client_profiles(last_name)')
        .order('name'),

      supabase
        .from('vaccination_records')
        .select(`
          *,
          pets (id, name, species, breed, client_profiles(last_name))
        `)
        .order('administered_date', { ascending: false })
        .limit(50)
    ]);

    if(petsResult.error && vaccinationHistoryResult.error){
      return NextResponse.json({ error: petsResult.error.message || vaccinationHistoryResult.error.message }, { status: 400 });
    }
    const { data: pets, error: petsError } = await supabase
      .from('pets')
      .select('id, name, species, client_profiles(last_name)')
      .order('name');

      if(petsError){
        return NextResponse.json({ error: petsError.message }, { status: 400 });
      }

      return NextResponse.json({
        pets: petsResult.data || [],
        history: vaccinationHistoryResult.data || [],
        vaccinations: []
      });
    }
  catch (error: any) {
    return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 });
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
             } catch {}
          },
        },
      }
    );

    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if(authError || !user || user.user_metadata.role !== 'veterinarian') {
      return NextResponse.json(
        { error: authError?.message || 'Unauthorized access' }, 
        { status: 400 }
      );
    }

    const { data: vetProfile, error: vetError } = await supabase
        .from('veterinarian_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if(vetError || !vetProfile) {
        return NextResponse.json({ error: vetError?.message || 'Veterinarian profile not found' }, { status: 400 });
      }

    const { data: pets, error: petsError } = await supabase
        .from('pets')
        .select('id, name, species, client_profiles(last_name)')
        .order('name');

    if(petsError){
      return NextResponse.json({ error: petsError.message }, { status: 400 });
    }
    
    const body = await request.json();
    
    const vaccinationData = {
      pet_id: body.pet_id,
      vaccine_name: body.vaccine_name,
      vaccine_type: body.vaccine_type,
      batch_number: body.batch_number,
      administered_date: body.administered_date,
      next_due_date: body.next_due_date,
      administered_by: vetProfile.id,
      side_effects_noted: body.notes
    }

    const { data, error } = await supabase
        .from('vaccination_records')
        .insert([vaccinationData])
        .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {

}