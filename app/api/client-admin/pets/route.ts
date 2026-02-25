import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import {
  sendClientNotification,
  getPetNotificationPayload,
} from '@/lib/notify';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET /api/client-admin/pets
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get('owner_id');
    const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 1000);
    const offset = parseInt(searchParams.get('offset') || '0');
    const includeArchived = searchParams.get('include_archived') === 'true';

    let query = supabaseAdmin
      .from('pets')
      .select(`
        *,
        client_profiles!pets_owner_id_fkey (
          id, first_name, last_name, phone, user_id
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (ownerId) {
      query = query.eq('owner_id', ownerId);
    }

    if (!includeArchived) {
      query = query.is('deleted_at', null);
    }

    const { data: pets, error } = await query;

    if (error) {
      console.error('Error fetching pets:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(pets || []);
  } catch (error) {
    console.error('Unexpected error in GET /pets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/client-admin/pets?pet_id=<uuid>
// Updates a pet profile and notifies the owner.
//
// Body examples:
//   { "weight": 5.2, "behavioral_notes": "calmer" }   → "updated" notification
//   { "is_archived": true }                            → "archived" notification
//   { "deleted_at": "<iso>" }                          → "archived" notification
export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const petId = searchParams.get('pet_id');

    if (!petId) {
      return NextResponse.json({ error: 'pet_id query param is required' }, { status: 400 });
    }

    const body = await request.json();

    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json({ error: 'Request body is empty' }, { status: 400 });
    }

    // ── 1. Fetch existing pet to get name + owner user_id
    const { data: existingPet, error: fetchError } = await supabaseAdmin
      .from('pets')
      .select(`
        id, name, is_archived, deleted_at,
        client_profiles!pets_owner_id_fkey (
          user_id
        )
      `)
      .eq('id', petId)
      .single();

    if (fetchError || !existingPet) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    }

    // ── 2. Apply the update
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('pets')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', petId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating pet:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // ── 3. Notify the owner
    const ownerUserId = (existingPet.client_profiles as any)?.user_id;

    if (ownerUserId) {
      // Determine what kind of change this is
      const isBeingArchived =
        (body.is_archived === true && !existingPet.is_archived) ||
        (body.deleted_at && !existingPet.deleted_at);

      const action = isBeingArchived ? 'archived' : 'updated';
      const { type, subject, content } = getPetNotificationPayload(action, existingPet.name);

      await sendClientNotification({
        recipient_id: ownerUserId,
        notification_type: type,
        subject,
        content,
        related_entity_type: 'pets',
        related_entity_id: petId,
      });
    } else {
      console.warn(`[notify] Could not resolve owner user_id for pet ${petId} — notification skipped`);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Unexpected error in PATCH /pets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}