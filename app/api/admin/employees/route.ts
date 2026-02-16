import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from "next/server";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

export async function GET(req: NextRequest) {
  const supabase = getSupabase();
  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");
  const search = searchParams.get("search") || "";

  try {
    let admins: any[] = [];
    if (!role || role === "admin") {
      const { data, error } = await supabase
        .from("admin_profiles")
        .select("*, users:user_id(id, email, role, account_status, last_login_at)")
        .order("created_at", { ascending: false });

      if (error) throw error;

      admins = (data || []).map((a: any) => ({
        id: a.id,
        user_id: a.user_id,
        first_name: a.first_name,
        last_name: a.last_name,
        email: a.users?.email || "",
        phone: a.phone,
        role: "admin",
        position: a.position,
        department: a.department,
        employee_id: a.employee_id,
        hire_date: a.hire_date,
        account_status: a.users?.account_status || "active",
        last_login_at: a.users?.last_login_at,
        access_level: a.access_level,
        created_at: a.created_at,
        updated_at: a.updated_at,
      }));
    }

    let vets: any[] = [];
    if (!role || role === "veterinarian") {
      const { data, error } = await supabase
        .from("veterinarian_profiles")
        .select("*, users:user_id(id, email, role, account_status, last_login_at)")
        .order("created_at", { ascending: false });

      if (error) throw error;

      vets = (data || []).map((v: any) => ({
        id: v.id,
        user_id: v.user_id,
        first_name: v.first_name,
        last_name: v.last_name,
        email: v.users?.email || "",
        phone: v.phone,
        role: "veterinarian",
        position: "Veterinarian",
        department: "Veterinary",
        employee_id: v.license_number,
        hire_date: v.hire_date,
        account_status: v.users?.account_status || "active",
        last_login_at: v.users?.last_login_at,
        license_number: v.license_number,
        specializations: v.specializations,
        certifications: v.certifications,
        years_of_experience: v.years_of_experience,
        biography: v.biography,
        consultation_fee: v.consultation_fee,
        employment_status: v.employment_status,
        termination_date: v.termination_date,
        created_at: v.created_at,
        updated_at: v.updated_at,
      }));
    }

    let employees = [...admins, ...vets];

    if (search) {
      const s = search.toLowerCase();
      employees = employees.filter(
        (e) =>
          e.first_name.toLowerCase().includes(s) ||
          e.last_name.toLowerCase().includes(s) ||
          e.email.toLowerCase().includes(s) ||
          (e.employee_id && e.employee_id.toLowerCase().includes(s))
      );
    }

    return NextResponse.json({ employees }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  const body = await req.json();
  const { role, email, first_name, last_name, phone, ...rest } = body;

  try {
    const { data: userData, error: userError } = await supabase
      .from("users")
      .insert({
        email,
        role: role === "veterinarian" ? "veterinarian" : "admin",
        account_status: "active",
        email_verified: false,
      })
      .select()
      .single();

    if (userError) throw userError;

    if (role === "veterinarian") {
      const { data: vetData, error: vetError } = await supabase
        .from("veterinarian_profiles")
        .insert({
          user_id: userData.id,
          first_name,
          last_name,
          phone,
          license_number: rest.license_number,
          specializations: rest.specializations || [],
          certifications: rest.certifications || [],
          years_of_experience: rest.years_of_experience || 0,
          biography: rest.biography || "",
          consultation_fee: rest.consultation_fee || 0,
          employment_status: rest.employment_status || "full_time",
          hire_date: rest.hire_date || new Date().toISOString().split("T")[0],
        })
        .select()
        .single();

      if (vetError) {
        await supabase.from("users").delete().eq("id", userData.id);
        throw vetError;
      }

      return NextResponse.json({ employee: vetData }, { status: 201 });
    } else {
      const { data: adminData, error: adminError } = await supabase
        .from("admin_profiles")
        .insert({
          user_id: userData.id,
          first_name,
          last_name,
          phone,
          employee_id: rest.employee_id,
          position: rest.position || "Staff",
          department: rest.department || "General",
          access_level: rest.access_level || 1,
          hire_date: rest.hire_date || new Date().toISOString().split("T")[0],
        })
        .select()
        .single();

      if (adminError) {
        await supabase.from("users").delete().eq("id", userData.id);
        throw adminError;
      }

      return NextResponse.json({ employee: adminData }, { status: 201 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const supabase = getSupabase();
  const body = await req.json();
  const { id, role, user_id, email, first_name, last_name, phone, account_status, ...rest } = body;

  try {
    const userUpdate: any = { updated_at: new Date().toISOString() };
    if (email) userUpdate.email = email;
    if (account_status) userUpdate.account_status = account_status;

    const { error: userError } = await supabase
      .from("users")
      .update(userUpdate)
      .eq("id", user_id);

    if (userError) throw userError;

    if (role === "veterinarian") {
      const { error: vetError } = await supabase
        .from("veterinarian_profiles")
        .update({
          first_name,
          last_name,
          phone,
          license_number: rest.license_number,
          specializations: rest.specializations,
          certifications: rest.certifications,
          years_of_experience: rest.years_of_experience,
          biography: rest.biography,
          consultation_fee: rest.consultation_fee,
          employment_status: rest.employment_status,
          hire_date: rest.hire_date,
          termination_date: rest.termination_date,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (vetError) throw vetError;
    } else {
      const { error: adminError } = await supabase
        .from("admin_profiles")
        .update({
          first_name,
          last_name,
          phone,
          employee_id: rest.employee_id,
          position: rest.position,
          department: rest.department,
          access_level: rest.access_level,
          hire_date: rest.hire_date,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (adminError) throw adminError;
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = getSupabase();
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user_id");

  if (!userId) {
    return NextResponse.json({ error: "user_id is required" }, { status: 400 });
  }

  try {
    const { error } = await supabase
      .from("users")
      .update({
        account_status: "suspended",
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) throw error;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
