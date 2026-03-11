import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { handleError } from "@/utils/error-handler";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || user.user_metadata?.role !== "veterinarian") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [petsResult, vaccinationHistoryResult] = await Promise.all([
      supabase
        .from("pets")
        .select("id, name, species, client_profiles(last_name)")
        .order("name"),

      supabase
        .from("vaccination_records")
        .select(`
          *,
          pets (id, name, species, breed, client_profiles(last_name))
        `)
        .order("administered_date", { ascending: false })
        .limit(50),
    ]);

    if (petsResult.error) return handleError(petsResult.error, "GET /api/vaccinations (pets)");
    if (vaccinationHistoryResult.error) return handleError(vaccinationHistoryResult.error, "GET /api/vaccinations (history)");

    return NextResponse.json({
      pets: petsResult.data || [],
      history: vaccinationHistoryResult.data || [],
      vaccinations: [],
    });
    
  } catch (error: any) {
    return handleError(error, "GET /api/vaccinations");
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || user.user_metadata?.role !== "veterinarian") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { data: vetProfile, error: vetError } = await supabase
      .from("veterinarian_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (vetError) return handleError(vetError, "POST /api/vaccinations (vet profile)");
    if (!vetProfile) return NextResponse.json({ error: "Veterinarian profile not found" }, { status: 404 });

    const body = await request.json();

    const vaccinationData = {
      pet_id: body.pet_id,
      vaccine_name: body.vaccine_name,
      vaccine_type: body.vaccine_type,
      batch_number: body.batch_number,
      administered_date: body.administered_date,
      next_due_date: body.next_due_date,
      administered_by: vetProfile.id,
      side_effects_noted: body.notes || null,
    };

    const { data, error } = await supabase
      .from("vaccination_records")
      .insert([vaccinationData])
      .select();

    if (error) return handleError(error, "POST /api/vaccinations (insert)");

    return NextResponse.json(data, { status: 201 });
    
  } catch (error: any) {
    return handleError(error, "POST /api/vaccinations");
  }
}

export async function PATCH(request: NextRequest) {
  // Add your update logic here later
}