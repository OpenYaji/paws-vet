import { NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { User, SupabaseClient } from "@supabase/supabase-js";
import { error } from "console";

export type AuthContext = {
    user: User | null;
    role: string | null;
    supabase: SupabaseClient;
};

export async function getAuthUser(request: NextRequest): Promise<AuthContext> {
    const supabase = await createClient();

    const authHeader = request.headers.get("Authorization");
    const token = authHeader ? authHeader.replace("Bearer ", "").trim() : null;

    const {
        data: { user },
        error,
    } = token
        ? await supabase.auth.getUser(token)
        : await supabase.auth.getUser();

    if (error || !user) return { user: null, role: null, supabase };

    const role = user?.user_metadata?.role?.toLowerCase() ||
                 user?.app_metadata?.role?.toLowerCase() ||
                 "client";

    return { user, role, supabase };
}