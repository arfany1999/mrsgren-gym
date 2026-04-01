import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default async function Home() {
  let apiStatus: "ok" | "down" | "unknown" = "unknown";
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(`${apiBase}/health`, { signal: ctrl.signal });
    clearTimeout(t);
    apiStatus = res.ok ? "ok" : "down";
  } catch {
    apiStatus = "down";
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.kicker}>MRSGREN</p>
        <h1 className={styles.title}>GYM</h1>
        <p className={styles.lead}>
          Workout tracker — exercises, routines, and training history. API:{" "}
          <span
            className={
              apiStatus === "ok"
                ? styles.pillOk
                : apiStatus === "down"
                  ? styles.pillDown
                  : styles.pillUnknown
            }
          >
            {apiStatus === "ok" ? "connected" : apiStatus === "down" ? "offline" : "unknown"}
          </span>
        </p>
        <p className={styles.hint}>
          Set <code>NEXT_PUBLIC_API_URL</code> in Vercel to your deployed API URL (e.g. Railway or Render).
        </p>
      </main>
    </div>
  );
}
