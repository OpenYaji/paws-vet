import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { create } from 'domain';

export function supabaseAdmin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    return createClient(url, key, { auth: { persistSession: false } });
}