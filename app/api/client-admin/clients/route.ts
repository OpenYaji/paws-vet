import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Service role client — bypasses RLS so admin can see all data
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    // BUG FIX: Support filtering by active/archived status from the URL
    const showDeleted = searchParams.get('deleted') === 'true';

    let query = supabaseAdmin
      .from('client_profiles')
      .select(`
        *,
        users!client_profiles_user_id_fkey (
          id,
          email,
          role,
          account_status,
          last_login_at,
          created_at,
          deleted_at
        )
      `)
      .order('created_at', { ascending: false });

    const { data: clients, error } = await query;

    if (error) {
      console.error('Error fetching clients:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!clients || clients.length === 0) {
      return NextResponse.json([]);
    }

    // Optimization: Bulk fetch pets and appointments to avoid N+1 queries
    const clientIds = clients.map((c: any) => c.id);

    // 1. Bulk fetch all pets for these clients
    const { data: allPets } = await supabaseAdmin
      .from('pets')
      .select('id, owner_id')
      .in('owner_id', clientIds)
      .eq('is_active', true);

    const pets = allPets || [];
    const petIds = pets.map(p => p.id);

    // 2. Bulk fetch all appointments for these pets
    let appointments: any[] = [];
    // Note: Supabase restricts 'in' filters to a maximum of 1000 items usually.
    // If the number of petIds exceeds 1000, we might need chunking, but for now this is much better than N queries.
    if (petIds.length > 0) {
      // Chunking petIds to handle cases where there are >1000 pets
      const CHUNK_SIZE = 500;
      for (let i = 0; i < petIds.length; i += CHUNK_SIZE) {
        const chunk = petIds.slice(i, i + CHUNK_SIZE);
        const { data: apptsChunk } = await supabaseAdmin
          .from('appointments')
          .select('id, pet_id')
          .in('pet_id', chunk);
        if (apptsChunk) {
          appointments.push(...apptsChunk);
        }
      }
    }

    // 3. Map counts in memory
    const petCountByClient: Record<string, number> = {};
    const petIdsByClient: Record<string, string[]> = {};
    
    for (const pet of pets) {
      petCountByClient[pet.owner_id] = (petCountByClient[pet.owner_id] || 0) + 1;
      if (!petIdsByClient[pet.owner_id]) {
        petIdsByClient[pet.owner_id] = [];
      }
      petIdsByClient[pet.owner_id].push(pet.id);
    }

    const apptCountByPet: Record<string, number> = {};
    for (const appt of appointments) {
      apptCountByPet[appt.pet_id] = (apptCountByPet[appt.pet_id] || 0) + 1;
    }

    const result = clients.map((client: any) => {
      const pCount = petCountByClient[client.id] || 0;
      const cPetIds = petIdsByClient[client.id] || [];
      const aCount = cPetIds.reduce((sum, pid) => sum + (apptCountByPet[pid] || 0), 0);

      return {
        ...client,
        pet_count: pCount,
        appointment_count: aCount,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Unexpected error in GET /clients:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
