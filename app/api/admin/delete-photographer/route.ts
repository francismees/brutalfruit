import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Missing photographer ID" }, { status: 400 });
    }

    // Identify the admin making the request
    const serverSupabase = await createClient();
    const { data: { user: adminUser } } = await serverSupabase.auth.getUser();

    if (!adminUser || adminUser.app_metadata?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // 1. Reassign uploaded images to the Admin so they aren't orphaned or deleted
    await supabase.from("images").update({ uploaded_by: adminUser.id }).eq("uploaded_by", id);

    // 2. Remove album assignments
    await supabase.from("album_photographers").delete().eq("photographer_id", id);
    
    // 2. Delete the public photographer profile
    await supabase.from("photographers").delete().eq("id", id);

    // 3. Delete the actual auth user (preventing future logins)
    const { error: authError } = await supabase.auth.admin.deleteUser(id);

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
