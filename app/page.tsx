import { redirect } from "next/navigation";

export default function HomePage() {
  // Entry point: redirect to albums page
  redirect("/albums");
}
