import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/auth-helpers-nextjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();

    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options),
              );
            } catch {}
          },
        },
      },
    );

    // Token in the Headers
    const authHeader = request.headers.get("Authorization");
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = token
      ? await supabase.auth.getUser(token)
      : await authClient.auth.getUser();

    const userRole = user?.user_metadata?.role || user?.app_metadata?.role;

    // Validate that the user is authenticated and has the veterinarian role
    if (authError || !user || user.user_metadata.role !== "veterinarian") {
      //Debug Log
      console.log("Auth Failed - User:", user, "Auth Error:", authError);

      return NextResponse.json(
        { error: "Unauthorized: Access restricted, For Veterinarians only." },
        { status: 401 },
      );
    }

    // Apply pagination
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");

    // Calculate the range for pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    try{
      // Fetch pets with pagination and exclude archived pets
      const {
        data,
        error,
        count
      } = await supabase
      .from('pets')
      .select(`
        id,
        owner_id,
        name,
        species,
        breed,
        color,
        gender,
        weight,
        microchip_number,
        photo_url,
        is_spayed_neutered,
        behavioral_notes,
        special_needs,
        current_medical_status,
        client_profiles (
          id,
          first_name,
          last_name,
          phone
        )
        `,
        { count: 'exact' })
      .range(from, to) // Only fetch the requested chunk of data
      .neq("is_archived", true) // Not equal to true to exclude archived pets
      .order("name", { ascending: true });

      if(error) throw error;

      return NextResponse.json({
        data: data,
        total: count,
        page: page,
      });

    } catch (error: any) {
      return NextResponse.json({
        error: "Internal Server Error: " + error.message,
        console: "Error fetching pets: " + error.message,
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error: " + error.message },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Required Field Validations
    if (!body.name || !body.species || !body.date_of_birth) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: Name, Owner ID, Species, and DOB are mandatory.",
        },
        { status: 400 },
      );
    }

    // Server-side Date Validation
    if (new Date(body.date_of_birth) > new Date()) {
      return NextResponse.json(
        {
          error: "Date of birth cannot be in the future.",
        },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("pets")
      .insert([
        {
          owner_id: body.owner_id || null,
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
        },
      ])
      .select(`
        *,
        client_profiles (
          id,
          first_name,
          last_name,
          phone,
          email,
          address_line1
        )
      `)
      .single();

    if (error) {
      console.error("Insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.log("Created pet:", data);
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error("Unexpected error in POST /api/pets:", error);
    return NextResponse.json(
      { error: "Internal server error: " + error.message },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();

    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options),
              );
            } catch {}
          },
        },
      },
    );

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    // Allow only veterinarians to update pet records
    if (authError || !user || user.user_metadata.role !== "veterinarian") {
      return NextResponse.json(
        { error: "Unauthorized: Access restricted to Veterinarians." },
        { status: 401 },
      );
    }

    const searchParams = new URL(request.url).searchParams;
    const id = searchParams.get("id");

    if (!id)
      return NextResponse.json(
        { error: "Pet ID is required" },
        { status: 400 },
      );

    const { error } = await supabase
      .from("pets")
      .update({ archived: true })
      .eq("id", id);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(
      { message: "Pet archived successfully" },
      { status: 200 },
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal server error: " + err.message },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Authenticate user and ensure they are a veterinarian
    const cookieStore = await cookies();

    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options),
              );
            } catch {}
          },
        },
      },
    );

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    // Allow only veterinarians to update pet records
    if (authError || !user || user.user_metadata.role !== "veterinarian") {
      return NextResponse.json(
        { error: "Unauthorized: Access restricted to Veterinarians." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const searchParams = new URL(request.url).searchParams;
    let id = searchParams.get("id") || body.id;

    if (!id)
      return NextResponse.json(
        { error: "Pet ID is required for update" },
        { status: 400 },
      );

    const { id: _, ...updates } = body;

    const { data, error } = await supabase
      .from("pets")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error: " + error.message },
      { status: 500 },
    );
  }
}
