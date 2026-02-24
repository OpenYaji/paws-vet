import { createCookieClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin-server";

// Force dynamic rendering to ensure fresh data on each request
export const dynamic = "force-dynamic";

/**
 * GET /api/quarantine
 * Retrieves quarantine records with associated pet information
 *
 * @returns {Promise<NextResponse>} JSON array of quarantine records with pet details
 *
 * Response format:
 * [
 *   {
 *     id: number,
 *     pet_id: number,
 *     reason: string,
 *     status: string,
 *     start_date: string,
 *     expected_end_date: string,
 *     pet: { id, name, species, breed, age, gender, color }
 *   }
 * ]
 */
export async function GET(request: NextRequest) {
  try {
    // Initialize regular Supabase client for authentication
    const supabaseCookie = await createCookieClient();

    // Verify user authentication - required for accessing quarantine data
    const {
      data: { user },
      error: authError,
    } = await supabaseCookie.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use admin client to bypass RLS (Row Level Security) for quarantine data access
    // This allows fetching all quarantine records regardless of user permissions
    const admin = supabaseAdmin();
    
    // Fetch quarantine records with nested pet information using admin privileges
    // Uses foreign key relationship to join pet details
    const { data: quarantineRecords, error } = await admin
      .from("quarantine_pets")
      .select(
        `
        id,
        pet_id,
        reason,
        status,
        start_date,
        expected_end_date,
        pets:pet_id(
            id,
            name,
            species,
            breed,
            gender,
            color
            )
        `,
      )
      .order("start_date", { ascending: false })
      .limit(10);

    // Alternative query without join (fallback if above fails)
    // Uncomment below and comment above if relationship issues persist
    /*
        const { data: quarantineRecords, error } = await supabase
            .from('quarantine_pets')
            .select(`
                id,
                pet_id,
                reason,
                status,
                start_date,
                expected_end_date
            `)
            .limit(10);
        */

    // Handle database query errors with detailed logging for debugging
    if (error) {
      console.error("Error fetching quarantine records (Admin Client):", error);
      console.error("Error details:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return NextResponse.json(
        {
          error: "Failed to fetch quarantine records",
          debug:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        },
        { status: 500 },
      );
    }

    // Return successful response with quarantine data (empty array if no records)
    return NextResponse.json(quarantineRecords || []);
  } catch (error) {
    // Handle unexpected errors (network, parsing, etc.)
    console.error("Error fetching quarantine records:", error);
    return NextResponse.json(
      { error: "Failed to fetch quarantine records" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/quarantine
 * Creates a new quarantine record for a pet
 *
 * @param {NextRequest} request - Request body should contain:
 *   - pet_id: number (required) - ID of the pet to quarantine
 *   - reason: string (required) - Reason for quarantine
 *   - notes: string (optional) - Additional notes
 *   - start_date: string (required) - ISO date string for quarantine start
 *   - expected_end_date: string (required) - ISO date string for expected end
 *
 * @returns {Promise<NextResponse>} Created quarantine record with status 201
 *
 * Response format:
 * {
 *   id: number,
 *   pet_id: number,
 *   reason: string,
 *   notes: string | null,
 *   start_date: string,
 *   expected_end_date: string,
 *   status: 'active'
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Initialize regular Supabase client for authentication
    const supabase = await createCookieClient();

    // Verify user authentication - required for creating quarantine records
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse JSON request body
    const body = await request.json();

    // Extract required and optional fields from request body
    const { pet_id, reason, notes, start_date, expected_end_date } = body;

    // Validate required fields before proceeding with database insertion
    if (!pet_id || !reason || !start_date || !expected_end_date) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Use admin client to bypass RLS for quarantine record creation
    // This ensures the record is created regardless of user's RLS permissions
    const admin = supabaseAdmin();
    
    // Insert new quarantine record into database using admin privileges
    // Status is automatically set to 'active' for new quarantine records
    const { data, error } = await admin
      .from("quarantine_pets")
      .insert({
            pet_id,
            reason,
            notes: notes || null,
            start_date,
            expected_end_date,
            status: "active",
        })
      .select() // Return the inserted record
      .single(); // Expect exactly one record to be returned

    // Handle database insertion errors with detailed logging
    if (error) {
      console.error("Error inserting quarantine record (Admin Client):", error);
      console.error("Error details:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return NextResponse.json(
        { 
          error: "Failed to create quarantine record",
          debug: process.env.NODE_ENV === "development" ? error.message : undefined
        },
        { status: 500 },
      );
    }

    // Return successful response with created quarantine record
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    // Handle unexpected errors (JSON parsing, network issues, etc.)
    console.error("Error creating quarantine record:", error);
    return NextResponse.json(
      { error: "Failed to create quarantine record" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try{
    const supabaseCookie = await createCookieClient();
    
    const { data : userData, error: authError } = await supabaseCookie.auth.getUser();

    if(authError || !userData.user){
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await request.json();
    const { id, status, end_date } = body;

    if(!body.id || !body.status ){
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Use admin client to bypass RLS for updating quarantine records
    const admin = supabaseAdmin();
    
    const { data, error } = await admin
      .from('quarantine_pets')
      .update({
        status: status,
        end_date: end_date || null,
      })
      .eq('id', id)
      .select()
      .single();

    if(error){
      console.error("Error updating quarantine record:", error);
      return NextResponse.json(
        { error: "Failed to update quarantine record", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch(error){
    console.error("Error updating quarantine record:", error);
    return NextResponse.json(
      { error: "Failed to update quarantine record" },
      { status: 500 },
    );
  }
}