import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  
  // Fetch published albums to decide landing destination
  const { data: albums } = await supabase
    .from("albums")
    .select("slug")
    .eq("is_published", true)
    .order("event_date", { ascending: false });

  // If exactly one album, bypass the list and go straight to the gallery
  if (albums && albums.length === 1) {
    redirect(`/gallery/${albums[0].slug}`);
  }

  // Otherwise, fallback to the full moments list
  redirect("/albums");
}
