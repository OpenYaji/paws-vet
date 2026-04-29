import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

const bucket = "clinical-captures";

export async function POST() {
  // Verify the caller is authenticated
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use service role to manage storage buckets
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check if bucket already exists
  const { data: buckets, error: listError } = await admin.storage.listBuckets();
  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 });
  }

  const exists = buckets?.some((b) => b.name === bucket);
  if (exists) {
    return NextResponse.json({ ok: true, created: false });
  }

  // Create the bucket (private — URLs are generated server-side)
  const { error: createError } = await admin.storage.createBucket(bucket, {
    public: true,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic"],
    fileSizeLimit: 10 * 1024 * 1024, // 10 MB
  });

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, created: true });
}
