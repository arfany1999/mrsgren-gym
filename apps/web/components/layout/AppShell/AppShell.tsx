import { BottomNav } from "@/components/layout/BottomNav/BottomNav";
import { OfflineBanner } from "@/components/layout/OfflineBanner/OfflineBanner";
import styles from "./AppShell.module.css";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <OfflineBanner />
      <main className={styles.main}>{children}</main>
      <BottomNav />
    </div>
  );
}
