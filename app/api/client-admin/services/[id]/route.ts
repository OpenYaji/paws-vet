import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireClientAdmin } from '@/lib/client-admin-auth';

// Use the service role key to bypass RLS for administrative actions
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireClientAdmin(request);
    if (auth.response) return auth.response;

    const { id } = await context.params;
    const body = await request.json();
    const { is_active } = body;

    const { data, error } = await supabaseAdmin
      .from('services')
      .update({ is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireClientAdmin(request);
    if (auth.response) return auth.response;

    const { id } = await context.params;

    const { error } = await supabaseAdmin
      .from('services')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === '23503') { // Postgres foreign_key_violation
        return NextResponse.json(
          { error: 'Cannot delete this service because it has been used in past or upcoming appointments. Please Deactivate it instead.' }, 
          { status: 409 }
        );
      }
      throw error;
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
