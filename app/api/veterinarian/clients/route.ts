import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    let dbQuery = supabaseAdmin
      .from("client_profiles")
      .select("id, first_name, last_name, phone");

    if (query) {
      dbQuery = dbQuery.or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone.ilike.%${query}%`);
    }

    dbQuery = dbQuery.limit(20);

    const { data: clients, error } = await dbQuery;

    if (error) {
      throw error;
    }

    return NextResponse.json(clients);
  } catch (error: any) {
    console.error("[GET /api/veterinarian/clients] error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
