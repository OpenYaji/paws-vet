import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { handleError } from "@/utils/error-handler";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user || user.user_metadata?.role !== "veterinarian") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("veterinarian_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      if (profileError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Profile not found" },
          { status: 204 },
        );
      }
      return handleError(profileError, "GET /api/veterinarian/profile");
    }

    return NextResponse.json(profile);
  } catch (error: any) {
    return handleError(error, "GET /api/veterinarian/profile");
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user || user.user_metadata?.role !== "veterinarian") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!existingUser) {
      const { error: userError } = await supabase.from("users").insert([
        {
          id: user.id,
          email: user.email,
          role: "veterinarian",
          account_status: "active",
        },
      ]);

      if (userError) {
        return handleError(
          userError,
          "POST /api/veterinarian/profile (user sync)",
        );
      }
    }

    const { error } = await supabase.from("veterinarian_profiles").upsert(
      {
        user_id: user.id,
        first_name: body.first_name,
        last_name: body.last_name,
        phone: body.phone,
        license_number: body.license_number,
        specializations: body.specializations,
        biography: body.biography,
        consultation_fee: body.consultation_fee,
        hire_date: body.hire_date,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) {
      return handleError(
        error,
        "POST /api/veterinarian/profile (profile upsert)",
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleError(error, "POST /api/veterinarian/profile");
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user || user.user_metadata?.role !== "veterinarian") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { data: oldRecord } = await supabase
      .from("veterinarian_profiles")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!oldRecord) {
      return NextResponse.json(
        { error: "Profile not found or access denied" },
        { status: 404 },
      );
    }

    const { data, error } = await supabase
      .from("veterinarian_profiles")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return handleError(error, "PATCH /api/veterinarian/profile");
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return handleError(error, "PATCH /api/veterinarian/profile");
  }
}
