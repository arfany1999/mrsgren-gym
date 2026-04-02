"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { WorkoutProvider } from "@/contexts/WorkoutContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <WorkoutProvider>{children}</WorkoutProvider>
    </AuthProvider>
  );
}
