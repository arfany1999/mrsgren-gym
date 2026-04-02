import { redirect } from "next/navigation";

// Root redirects to dashboard (auth guard is in the (app) layout)
export default function RootPage() {
  redirect("/dashboard");
}
