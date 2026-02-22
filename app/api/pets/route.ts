import { NextRequest, NextResponse } from "next/server";
import { createCookieClient } from "@/lib/supabase-server";

// Helper function to get the user and role cleanly
async function getAuthUser(request: NextRequest) {
  const supabase = await createCookieClient();
  
  // Check for manual token in headers (for fetcher)
  const authHeader = request.headers.get("Authorization");
  const token = authHeader ? authHeader.replace("Bearer ", "").trim() : null;

  const {
    data: { user },
    error,
  } = token 
    ? await supabase.auth.getUser(token) 
    : await supabase.auth.getUser();

  if (error || !user) return { user: null, role: null, supabase };

  const role = user?.user_metadata?.role?.toLowerCase() || user?.app_metadata?.role?.toLowerCase() || "client";
  
  return { user, role, supabase };
}

export async function GET(request: NextRequest) {
  try {
    const { user, role, supabase } = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build the query
    let query = supabase
      .from("pets")
      .select(
        `
        id, owner_id, name, species, breed, color, gender, weight, 
        microchip_number, photo_url, is_spayed_neutered, behavioral_notes, 
        special_needs, current_medical_status,
        client_profiles ( id, first_name, last_name, phone )
      `,
        { count: "exact" },
      )
      .range(from, to)
      .neq("is_archived", true)
      .order("name", { ascending: true });

    // Restrict to the client's own pets if they are not staff
    if (role === "client") {
      query = query.eq("owner_id", user.id);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({ data, total: count, page });
  } catch (error: any) {
    return NextResponse.json({ error: "Server error: " + error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, role, supabase } = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.name || !body.species || !body.date_of_birth) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    if (new Date(body.date_of_birth) > new Date()) {
      return NextResponse.json({ error: "Date of birth cannot be in the future." }, { status: 400 });
    }

    // Force the owner_id to be the logged-in client if they are not staff
    const assignedOwnerId = role === "client" ? user.id : (body.owner_id || null);

    const { data, error } = await supabase
      .from("pets")
      .insert([{
        owner_id: assignedOwnerId,
        name: body.name,
        species: body.species,
        breed: body.breed || null,
        date_of_birth: body.date_of_birth,
        gender: body.gender,
        color: body.color || null,
        weight: parseFloat(body.weight) || 0,
        microchip_number: body.microchip_number || null,
        is_spayed_neutered: body.is_spayed_neutered || false,
        behavioral_notes: body.behavioral_notes || null,
        special_needs: body.special_needs || null,
        current_medical_status: body.current_medical_status || null,
        photo_url: body.photo_url || null,
        is_active: true,
      }])
      .select(`*, client_profiles ( id, first_name, last_name, phone, email )`)
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Server error: " + error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, role, supabase } = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const searchParams = new URL(request.url).searchParams;
    const id = searchParams.get("id") || body.id;

    if (!id) return NextResponse.json({ error: "Pet ID is required" }, { status: 400 });

    const { id: _, ...updates } = body;

    let query = supabase.from("pets").update(updates).eq("id", id);

    // Clients can only update their own pets
    if (role === "client") {
      query = query.eq("owner_id", user.id);
    }

    const { data, error } = await query.select().single();

    if (error) throw error;
    
    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: "Server error: " + error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, role, supabase } = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = new URL(request.url).searchParams;
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "Pet ID is required" }, { status: 400 });

    let query = supabase.from("pets").update({ is_archived: true }).eq("id", id);

    // Clients can only archive their own pets
    if (role === "client") {
      query = query.eq("owner_id", user.id);
    }

    const { error } = await query;

    if (error) throw error;
    
    return NextResponse.json({ message: "Pet archived successfully" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: "Server error: " + error.message }, { status: 500 });
  }
}