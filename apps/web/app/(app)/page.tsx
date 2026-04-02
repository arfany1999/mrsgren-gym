// NOTE: This file exists only because it cannot be deleted.
// The "/" route is handled by app/page.tsx which redirects to /dashboard.
// Delete this file if the build errors about conflicting routes.
import { notFound } from "next/navigation";
export default function Noop() { notFound(); }
