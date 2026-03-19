import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { handleError } from "@/utils/error-handler";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get("q");

    // Search pets by name or breed, case-insensitive, for the authenticated veterinarian
    const { data, error } = await supabase
      .from("pets")
      .select(
        `
            id,
            name,
            species,
            breed,
            date_of_birth,
            client_profiles (first_name, last_name)
        `,
      )
      .ilike("name", `%${searchQuery}%`) // Finds names containing the letters
      .eq("is_active", true) // Only get active pets
      .limit(5) // Keep it fast by only returning 5 results
      .order("name", { ascending: true });

    if (error) {
      return handleError(error, "GET /api/veterinarian/pets/search");
    }
    return NextResponse.json({ data });
  } catch (error: any) {
    return handleError(error, "GET /api/veterinarian/pets/search");
  }
}
