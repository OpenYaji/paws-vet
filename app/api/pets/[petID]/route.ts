import { createClient } from '@supabase/supabase-js'; // Fixed: Use service role client
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// Fixed: Changed to support both naming conventions
type RouteContext = {
  params: Promise<{ [key: string]: string }>; // Flexible param type
}

export async function PATCH(
  request: NextRequest, 
  context: RouteContext
) {
  try {
    // Await params for Next.js 15 compatibility
    const params = await context.params;
    console.log('DEBUG - All params received:', params); // Debug log
    
    // Fixed: Support multiple naming conventions (petID, id, petId)
    const petId = params.petID || params.id || params.petId;

    if (!petId) {
      console.error('ERROR - No pet ID found in params:', params);
      return NextResponse.json({ error: 'Pet ID is required' }, { status: 400 });
    }

    console.log('SUCCESS - Processing archive for pet:', petId);

    // Read the request body
    const body = await request.json();
    const { is_archived } = body;
    console.log('Archive request body:', { is_archived });

    // Fixed: Use service role to bypass RLS (like other API routes do)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('Attempting to update pet with ID:', petId, 'to is_archived:', is_archived);

    // First, check if pet exists (to help debug RLS issues)
    const { data: existingPet, error: checkError } = await supabase
      .from('pets')
      .select('id, name, is_archived')
      .eq('id', petId)
      .single();

    console.log('Pet exists check - Data:', existingPet, 'Error:', checkError);

    if (checkError) {
      console.error('Error checking pet existence:', checkError);
      // Continue anyway - might be RLS blocking SELECT
    }

    if (!existingPet && !checkError) {
      return NextResponse.json(
        { error: 'Pet not found' },
        { status: 404 }
      );
    }

    // Update the database
    const { data, error } = await supabase
      .from('pets')
      .update({ is_archived: is_archived })
      .eq('id', petId)
      .select();

    console.log('Database response - Data:', data, 'Error:', error);

    if (error) {
        console.error('Supabase error details:', error);
        throw error;
    }

    // Check if the database actually updated a record
    if(!data || data.length === 0) {
      console.warn('No rows updated for pet ID:', petId);
      return NextResponse.json(
        { error: 'Pet not found or already archived' },
        { status: 404 });
    }

    console.log('Pet archived successfully:', data);
    return NextResponse.json({ success: true, message: 'Pet archived successfully', data });

  } catch (error: any) {
    console.error('Archive pet error:', error);
    return NextResponse.json({ error: error.message || 'Failed to archive pet' }, { status: 500 });
  }
}