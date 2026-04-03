import { redirect } from "next/navigation";

// Root redirects to history (auth guard is in the (app) layout)
export default function RootPage() {
  redirect("/workouts");
}
