import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { handleError } from "@/utils/error-handler";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || user.user_metadata?.role !== "veterinarian") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pet_id, vaccine_name, next_due_date } = await request.json();
    if (!pet_id || !vaccine_name || !next_due_date) {
      return NextResponse.json(
        { error: "pet_id, vaccine_name, and next_due_date are required" },
        { status: 400 }
      );
    }

    // Resolve the pet name and owner's auth user_id in one query
    const { data: pet, error: petError } = await supabase
      .from("pets")
      .select("name, client_profiles!pets_owner_id_fkey(user_id, first_name)")
      .eq("id", pet_id)
      .maybeSingle();

    if (petError) return handleError(petError, "POST /api/vaccinations/notify (pet lookup)");
    if (!pet?.client_profiles) {
      return NextResponse.json({ error: "Pet or owner not found" }, { status: 404 });
    }

    const owner = pet.client_profiles as any;
    const dueDateFormatted = new Date(next_due_date).toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
    });

    const { error: notifError } = await supabase.from("notification_logs").insert({
      recipient_id:        owner.user_id,
      notification_type:   "vaccine_due",
      subject:             "Vaccination Reminder",
      content:             `Hi ${owner.first_name}, your pet ${pet.name}'s ${vaccine_name} booster is scheduled for ${dueDateFormatted}. Please visit the clinic on or before the due date.`,
      related_entity_type: "pets",
      related_entity_id:   pet_id,
      delivery_status:     "delivered",
      sent_at:             new Date().toISOString(),
    });

    if (notifError) return handleError(notifError, "POST /api/vaccinations/notify (insert)");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleError(error, "POST /api/vaccinations/notify");
  }
}
