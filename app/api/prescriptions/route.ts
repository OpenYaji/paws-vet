import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase.from('prescriptions').select('*').order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { data, error } = await supabase.from('prescriptions').insert([body]).select();

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