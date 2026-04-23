import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface BatchImageInput {
  album_id: string;
  storage_path: string;
  filename: string;
  file_size: number | null;
  width: number | null;
  height: number | null;
  media_type?: 'image' | 'video';
  duration?: number | null;
  video_thumbnail_path?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { images } = (await request.json()) as { images: BatchImageInput[] };

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: "Missing or empty images array" },
        { status: 400 }
      );
    }

    if (images.length > 50) {
      return NextResponse.json(
        { error: "Maximum 50 images per batch" },
        { status: 400 }
      );
    }

    // Validate all entries
    for (const img of images) {
      if (!img.album_id || !img.storage_path || !img.filename) {
        return NextResponse.json(
          { error: `Invalid image entry: missing required fields` },
          { status: 400 }
        );
      }
    }

    // Build records with uploaded_by set to the authenticated user
    const records = images.map((img) => ({
      album_id: img.album_id,
      storage_path: img.storage_path,
      filename: img.filename,
      file_size: img.file_size,
      width: img.width,
      height: img.height,
      media_type: img.media_type ?? 'image',
      duration: img.duration ?? null,
      video_thumbnail_path: img.video_thumbnail_path ?? null,
      uploaded_by: user.id,
    }));

    // Attempt batch insert
    const { data, error: insertError } = await supabase
      .from("images")
      .insert(records)
      .select();

    if (insertError) {
      console.error("Batch insert failed, attempting individual inserts:", insertError);

      // Fallback: individual inserts
      const results: Array<{ success: boolean; filename: string; error?: string }> = [];

      for (const record of records) {
        const { error: singleError } = await supabase
          .from("images")
          .insert(record);

        results.push({
          success: !singleError,
          filename: record.filename,
          error: singleError?.message,
        });
      }

      const successCount = results.filter((r) => r.success).length;
      const failedCount = results.filter((r) => !r.success).length;

      return NextResponse.json({
        partial: true,
        successCount,
        failedCount,
        results,
      });
    }

    return NextResponse.json({
      success: true,
      count: data?.length ?? records.length,
      images: data,
    });
  } catch (err) {
    console.error("Batch insert error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
