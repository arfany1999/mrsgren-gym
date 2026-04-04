import { redirect } from "next/navigation";

// Root redirects to the Home (dashboard) page
export default function RootPage() {
  redirect("/dashboard");
}
