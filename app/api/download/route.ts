import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { STORAGE_BUCKET } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path");
  const filename = request.nextUrl.searchParams.get("filename");

  if (!path) {
    return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(path);

    if (error || !data) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const headers = new Headers();
    headers.set(
      "Content-Disposition",
      `attachment; filename="${filename || path.split("/").pop() || "download"}"`
    );
    headers.set("Content-Type", data.type || "application/octet-stream");
    headers.set("Cache-Control", "private, max-age=3600");

    return new NextResponse(data, { status: 200, headers });
  } catch {
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
