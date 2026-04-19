"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button/Button";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import Image from "next/image";
import { formatDateFull } from "@/lib/formatters";
import { getReports, type WorkoutReportEntry } from "@/lib/gymProfile";
import { TROPHIES, getTrophyProgress, nextTierLabel } from "@/lib/trophies";
import { Avatar } from "@/components/ui/Avatar/Avatar";
import { useTheme } from "@/contexts/ThemeContext";
import styles from "./page.module.css";

type Segment = "Duration" | "Volume" | "Reps";

function formatDuration(mins: number): string {
  if (mins < 1)  return "< 1 min";
  if (mins < 60) return `${Math.round(mins)} min`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatBigDuration(totalMins: number): string {
  if (totalMins < 60) return `${Math.round(totalMins)}m`;
  const h = Math.floor(totalMins / 60);
  const m = Math.round(totalMins % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${Math.round(kg)}kg`;
}

/** 10 lego-style workout avatars — user can pick one or let it rotate daily */
const WORKOUT_LEGOS = [
  "💪", "🏋️", "🦾", "🔥", "⚡",
  "🚀", "🥇", "👊", "🎯", "⭐",
] as const;

function legoForToday(): string {
  const now = new Date();
  // Day-of-year (0-indexed); stable for whole local day
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  const idx = dayOfYear % WORKOUT_LEGOS.length;
  return WORKOUT_LEGOS[idx] ?? "💪";
}

/** Is this ISO timestamp today in local time? */
function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
      && d.getMonth()    === now.getMonth()
      && d.getDate()     === now.getDate();
}

/** Compute unique workout days + current streak from ISO timestamps */
function computeDayStats(dates: string[]): { days: number; currentStreak: number; longestStreak: number } {
  if (dates.length === 0) return { days: 0, currentStreak: 0, longestStreak: 0 };

  // Build set of YYYY-MM-DD in local time
  const dayKeys = new Set<string>();
  dates.forEach(iso => {
    const d = new Date(iso);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    dayKeys.add(k);
  });

  const sortedDays = Array.from(dayKeys).sort();
  const days = sortedDays.length;

  // Current streak: walk back from today
  const msPerDay = 24 * 60 * 60 * 1000;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today.getTime() - msPerDay);

  function keyFor(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  let currentStreak = 0;
  const todayKey = keyFor(today);
  const yestKey = keyFor(yesterday);
  if (dayKeys.has(todayKey) || dayKeys.has(yestKey)) {
    const startRef = dayKeys.has(todayKey) ? today : yesterday;
    const cursor = new Date(startRef);
    while (dayKeys.has(keyFor(cursor))) {
      currentStreak++;
      cursor.setTime(cursor.getTime() - msPerDay);
    }
  }

  // Longest streak: walk sorted days checking for consecutive
  let longestStreak = 0;
  let run = 0;
  let prev: Date | null = null;
  sortedDays.forEach(k => {
    const parts = k.split("-").map(Number);
    const y = parts[0] ?? 1970;
    const m = parts[1] ?? 1;
    const dNum = parts[2] ?? 1;
    const cur = new Date(y, m - 1, dNum);
    if (prev && cur.getTime() - prev.getTime() === msPerDay) {
      run++;
    } else {
      run = 1;
    }
    if (run > longestStreak) longestStreak = run;
    prev = cur;
  });

  return { days, currentStreak, longestStreak };
}

export default function ProfilePage() {
  const { profile, user, supabase, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [totalWorkouts,   setTotalWorkouts]   = useState(0);
  const [workoutDays,     setWorkoutDays]     = useState(0);
  const [currentStreak,   setCurrentStreak]   = useState(0);
  const [longestStreak,   setLongestStreak]   = useState(0);
  const [totalVolumeKg,   setTotalVolumeKg]   = useState(0);
  const [totalDurationMin,setTotalDurationMin]= useState(0);
  const [loading,         setLoading]         = useState(true);
  const [loggingOut,      setLoggingOut]      = useState(false);
  const [activeSegment,   setActiveSegment]   = useState<Segment>("Duration");
  const [chartValues,     setChartValues]     = useState<number[]>([0, 0, 0, 0]);
  const [chartLabel,      setChartLabel]      = useState("0 hours this week");
  const [historyOpen,     setHistoryOpen]     = useState(false);
  const [reports,         setReports]         = useState<WorkoutReportEntry[]>([]);

  // Edit profile modal
  const [editOpen,      setEditOpen]      = useState(false);
  const [editName,      setEditName]      = useState("");
  const [editUsername,  setEditUsername]  = useState("");
  const [editSaving,    setEditSaving]    = useState(false);
  const [editError,     setEditError]     = useState<string | null>(null);

  // Share toast
  const [shareToast, setShareToast] = useState<string | null>(null);

  const fetchChartData = useCallback(async (segment: Segment) => {
    const now  = new Date();
    const from = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString();

    if (segment === "Reps") {
      const { data } = await supabase
        .from("workouts")
        .select("started_at, workout_exercises(workout_sets(reps))")
        .not("finished_at", "is", null)
        .gte("started_at", from);

      const weeks = [0, 0, 0, 0];
      (data ?? []).forEach((w: Record<string, unknown>) => {
        const idx = Math.min(
          Math.floor((now.getTime() - new Date(w.started_at as string).getTime()) / (7 * 24 * 60 * 60 * 1000)), 3);
        const wes = (w.workout_exercises as Record<string, unknown>[]) ?? [];
        wes.forEach((we) => {
          const sets = (we.workout_sets as Record<string, unknown>[]) ?? [];
          sets.forEach((s) => { weeks[idx] = (weeks[idx] ?? 0) + ((s.reps as number) ?? 0); });
        });
      });
      const vals = [...weeks].reverse();
      setChartValues(vals);
      setChartLabel(`${(vals[3] ?? 0).toLocaleString()} reps this week`);
    } else {
      const { data } = await supabase
        .from("workouts")
        .select("started_at, duration_secs, total_volume")
        .not("finished_at", "is", null)
        .gte("started_at", from);

      const weeks = [0, 0, 0, 0];
      (data ?? []).forEach((w: Record<string, unknown>) => {
        const idx = Math.min(
          Math.floor((now.getTime() - new Date(w.started_at as string).getTime()) / (7 * 24 * 60 * 60 * 1000)), 3);
        if (segment === "Duration") {
          weeks[idx] = (weeks[idx] ?? 0) + (((w.duration_secs as number) ?? 0) / 3600);
        } else {
          weeks[idx] = (weeks[idx] ?? 0) + ((w.total_volume as number) ?? 0);
        }
      });
      const vals = [...weeks].reverse();
      setChartValues(vals);
      setChartLabel(segment === "Duration"
        ? `${(vals[3] ?? 0).toFixed(1)} hours this week`
        : `${Math.round(vals[3] ?? 0).toLocaleString()} kg this week`);
    }
  }, [supabase]);

  // Fetch all stats (totals + day streak)
  const fetchAllStats = useCallback(async () => {
    const [{ count }, { data: allRows }] = await Promise.all([
      supabase
        .from("workouts")
        .select("id", { count: "exact", head: true })
        .not("finished_at", "is", null),
      supabase
        .from("workouts")
        .select("started_at, duration_secs, total_volume")
        .not("finished_at", "is", null),
    ]);

    setTotalWorkouts(count ?? 0);

    const rows = (allRows ?? []) as Array<{ started_at: string; duration_secs: number | null; total_volume: number | null }>;
    const volSum = rows.reduce((a, r) => a + (r.total_volume ?? 0), 0);
    const durMin = rows.reduce((a, r) => a + ((r.duration_secs ?? 0) / 60), 0);
    setTotalVolumeKg(volSum);
    setTotalDurationMin(durMin);

    const stats = computeDayStats(rows.map(r => r.started_at));
    setWorkoutDays(stats.days);
    setCurrentStreak(stats.currentStreak);
    setLongestStreak(stats.longestStreak);
  }, [supabase]);

  useEffect(() => {
    async function load() {
      try {
        await Promise.all([fetchAllStats(), fetchChartData("Duration")]);
      } finally {
        setLoading(false);
      }
    }
    load();
    if (user?.email) {
      setReports(getReports(user.email));
    }
  }, [supabase, fetchAllStats, fetchChartData, user?.email]);

  async function handleSegment(seg: Segment) {
    setActiveSegment(seg);
    await fetchChartData(seg);
  }

  async function handleLogout() {
    setLoggingOut(true);
    try { await logout(); } finally { setLoggingOut(false); }
  }

  function openEdit() {
    setEditName(displayName);
    setEditUsername(displayUsername ?? "");
    setEditError(null);
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!user?.id) return;
    const name = editName.trim();
    const username = editUsername.trim().replace(/^@/, "");
    if (!name) { setEditError("Name can't be empty"); return; }
    if (username && !/^[a-zA-Z0-9_.]{2,24}$/.test(username)) {
      setEditError("Username: 2-24 chars, letters/numbers/._ only");
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      // Upsert into profiles table
      const { error: upErr } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          email: user.email ?? null,
          name,
          username: username || null,
        }, { onConflict: "id" });
      if (upErr) throw upErr;

      // Mirror into auth metadata so it survives reload
      await supabase.auth.updateUser({ data: { name, username: username || null } });
      setEditOpen(false);
      // Refresh by reloading — AuthContext will refetch profile on auth state change
      window.location.reload();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleShare() {
    const latest = reports[0];
    let lines: string[];
    if (latest) {
      const totalReps = latest.exercises.reduce((a, ex) => {
        const parts = ex.setSummary ? ex.setSummary.split(" · ") : [];
        return a + parts.reduce((rs, p) => {
          const n = parseInt(p, 10);
          return rs + (isNaN(n) ? 0 : n);
        }, 0);
      }, 0);
      const legoIcon = legoForToday();
      lines = [
        `${legoIcon} Day ${latest.dayNumber} — ${latest.title}`,
        `${formatDate(latest.date)}`,
        ``,
        `⏱️ ${formatDuration(latest.durationMins)}`,
        `🏋️ ${latest.exercises.length} exercises · ${latest.totalSets} sets${totalReps ? ` · ${totalReps} reps` : ""}`,
        latest.totalVolume > 0 ? `💪 ${Math.round(latest.totalVolume).toLocaleString()} kg lifted` : "",
        `🔥 ${latest.totalCalories.toLocaleString()} kcal burned`,
        currentStreak > 0 ? `${legoIcon} ${currentStreak}-day streak` : "",
        ``,
        ...latest.exercises.slice(0, 5).map(ex =>
          `• ${ex.name} — ${ex.sets} set${ex.sets !== 1 ? "s" : ""}${ex.setSummary ? ` (${ex.setSummary.split(" · ")[0]})` : ""}`
        ),
        ``,
        `Tracked with HA GYM — https://gym.mrgren.store`,
      ].filter(Boolean);
    } else {
      lines = [
        `💪 GYM Tracker — https://gym.mrgren.store`,
      ];
    }
    const text = lines.join("\n");
    const shareData: ShareData = {
      title: latest ? `Day ${latest.dayNumber} — ${latest.title}` : "My GYM Tracker",
      text,
    };
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share(shareData);
        return;
      }
    } catch {
      // User cancelled or share failed — fall through to clipboard
    }
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setShareToast("Copied to clipboard!");
        setTimeout(() => setShareToast(null), 2200);
      }
    } catch {
      setShareToast("Couldn't share");
      setTimeout(() => setShareToast(null), 2200);
    }
  }

  const joinDate     = user?.created_at ? formatDateFull(user.created_at) : "—";
  const displayName  = profile?.name || (user?.user_metadata?.name as string) || user?.email?.split("@")[0] || "Athlete";
  const displayUsername = profile?.username || (user?.user_metadata?.username as string) || user?.email?.split("@")[0] || null;
  const displayEmail = profile?.email || user?.email || "—";
  const maxVal       = Math.max(...chartValues, 1);

  const trophyProgress = getTrophyProgress(workoutDays);
  const nextLabel = nextTierLabel(trophyProgress);

  return (
    <div className={styles.page}>
      {/* ── Edit profile modal ── */}
      {editOpen && (
        <div className={styles.modalOverlay} onClick={() => !editSaving && setEditOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Edit Profile</h2>
            <label className={styles.modalLabel}>Name</label>
            <input
              type="text"
              className={styles.modalInput}
              value={editName}
              onChange={e => setEditName(e.target.value)}
              placeholder="Your name"
              maxLength={40}
              disabled={editSaving}
            />
            <label className={styles.modalLabel}>Username</label>
            <input
              type="text"
              className={styles.modalInput}
              value={editUsername}
              onChange={e => setEditUsername(e.target.value)}
              placeholder="username"
              maxLength={24}
              disabled={editSaving}
            />
            {editError && <p className={styles.modalError}>{editError}</p>}
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancel}
                onClick={() => setEditOpen(false)}
                disabled={editSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.modalSave}
                onClick={saveEdit}
                disabled={editSaving}
              >
                {editSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share toast */}
      {shareToast && (
        <div className={styles.toast}>{shareToast}</div>
      )}

      {/* History full-screen overlay */}
      {historyOpen && (
        <div className={styles.historyOverlay}>
          <div className={styles.historyTopBar}>
            <button
              type="button"
              className={styles.historyBackBtn}
              onClick={() => setHistoryOpen(false)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span className={styles.historyTitle}>Workout History</span>
          </div>

          <div className={styles.historyList}>
            {reports.length === 0 ? (
              <div className={styles.historyEmpty}>
                <p className={styles.historyEmptyEmoji}>📋</p>
                <p className={styles.historyEmptyText}>No workout reports yet</p>
                <p className={styles.historyEmptyHint}>Finish a workout to see your reports here</p>
              </div>
            ) : (
              reports.map(r => {
                const td = typeof r.trainingDay === "number" ? r.trainingDay : r.dayNumber;
                const tierAtTime = getTrophyProgress(td);
                const tierMilestone = tierAtTime.currentTier;
                return (
                <div key={r.id} className={styles.historyCard}>
                  <div className={styles.hCardHeader}>
                    <div className={styles.hCardLeft}>
                      <div className={styles.hBadgeRow}>
                        <span className={styles.hDayBadge}>Workout #{r.dayNumber}</span>
                        <span className={styles.hTrainingBadge}>Day {td}</span>
                      </div>
                      <p className={styles.hTitle}>{r.title}</p>
                      <p className={styles.hDate}>{formatDate(r.date)}</p>
                    </div>
                    <div className={styles.hCardRight}>
                      {tierMilestone && (
                        <div
                          className={styles.hTierChip}
                          title={`${tierMilestone.label} tier earned`}
                        >
                          <Image
                            src={tierMilestone.image}
                            alt={tierMilestone.label}
                            width={22}
                            height={22}
                            unoptimized
                          />
                          <span>{tierMilestone.label}</span>
                        </div>
                      )}
                      {!tierMilestone && tierAtTime.nextTier && (
                        <div className={styles.hTierChipPending}>
                          → {tierAtTime.nextTier.label}
                          <span className={styles.hTierChipCount}>
                            {tierAtTime.daysRemaining}d
                          </span>
                        </div>
                      )}
                      <div className={styles.hCalsBig}>
                        <span className={styles.hCalsNum}>{r.totalCalories.toLocaleString()}</span>
                        <span className={styles.hCalsUnit}>kcal</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.hStats}>
                    <div className={styles.hStat}>
                      <span className={styles.hStatVal}>{formatDuration(r.durationMins)}</span>
                      <span className={styles.hStatLbl}>Duration</span>
                    </div>
                    <div className={styles.hStatDivider} />
                    <div className={styles.hStat}>
                      <span className={styles.hStatVal}>{r.exercises.length}</span>
                      <span className={styles.hStatLbl}>Exercises</span>
                    </div>
                    <div className={styles.hStatDivider} />
                    <div className={styles.hStat}>
                      <span className={styles.hStatVal}>{r.totalSets}</span>
                      <span className={styles.hStatLbl}>Sets</span>
                    </div>
                    {r.totalVolume > 0 && (
                      <>
                        <div className={styles.hStatDivider} />
                        <div className={styles.hStat}>
                          <span className={styles.hStatVal}>{Math.round(r.totalVolume).toLocaleString()} kg</span>
                          <span className={styles.hStatLbl}>Volume</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className={styles.hExList}>
                    {r.exercises.map((ex, i) => (
                      <div key={i} className={styles.hExRow}>
                        <div className={styles.hExDot} />
                        <span className={styles.hExName}>{ex.name}</span>
                        <span className={styles.hExDetail}>
                          {ex.sets} set{ex.sets !== 1 ? "s" : ""}
                          {ex.setSummary ? ` · ${ex.setSummary.split(" · ")[0]}…` : ""}
                        </span>
                        <span className={styles.hExCals}>{ex.calories} kcal</span>
                      </div>
                    ))}
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── Main profile content ── */}
      <header className={styles.header}>
        <h1 className={styles.headerName}>{displayUsername || displayName}</h1>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label="Edit profile"
            onClick={openEdit}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M4 20h4l10-10-4-4L4 16v4z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label="Share progress"
            onClick={handleShare}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 6l-4-4-4 4M12 2v14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </header>

      <section className={styles.hero}>
        <Avatar
          name={displayName}
          email={user?.email ?? profile?.email}
          src={profile?.avatar_url}
          size={68}
          className={styles.avatarImg}
        />
        <div className={styles.heroMeta}>
          <h2 className={styles.name}>{displayName}</h2>
          <div className={styles.statsInline}>
            <span><b>{totalWorkouts}</b> Workouts</span>
            <span><b>{workoutDays}</b> Days</span>
          </div>
        </div>
        <button
          type="button"
          className={styles.historyBtn}
          onClick={() => {
            if (user?.email) setReports(getReports(user.email));
            setHistoryOpen(true);
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M3.05 12A9 9 0 1012 21v0M3 3v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          History
        </button>
      </section>

      {/* ── Today / Latest Training Report banner ── */}
      {(() => {
        const latest = reports[0];

        // Shared medal-progress strip — prominently shows the next award
        const medalStrip = (
          <div className={styles.medalStrip}>
            {trophyProgress.nextTier ? (
              <>
                <Image
                  src={trophyProgress.nextTier.image}
                  alt={trophyProgress.nextTier.label}
                  width={56}
                  height={56}
                  className={styles.medalStripIcon}
                  unoptimized
                />
                <div className={styles.medalStripBody}>
                  <div className={styles.medalStripTopRow}>
                    <span className={styles.medalStripDay}>
                      Workout Day <b>#{workoutDays}</b>
                    </span>
                    <span className={styles.medalStripCount}>
                      {trophyProgress.daysIntoCurrent}/
                      {trophyProgress.nextTier.threshold - (trophyProgress.currentTier?.threshold ?? 0)}
                    </span>
                  </div>
                  <div className={styles.medalStripRemaining}>
                    <b>{trophyProgress.daysRemaining}</b> day
                    {trophyProgress.daysRemaining === 1 ? "" : "s"} to{" "}
                    <span className={styles.medalStripNextName}>{trophyProgress.nextTier.label}</span>
                  </div>
                  <div className={styles.medalStripBar}>
                    <div
                      className={styles.medalStripBarFill}
                      style={{ width: `${trophyProgress.segmentPercent}%` }}
                    />
                  </div>
                </div>
              </>
            ) : trophyProgress.currentTier ? (
              <>
                <Image
                  src={trophyProgress.currentTier.image}
                  alt={trophyProgress.currentTier.label}
                  width={56}
                  height={56}
                  className={styles.medalStripIcon}
                  unoptimized
                />
                <div className={styles.medalStripBody}>
                  <div className={styles.medalStripTopRow}>
                    <span className={styles.medalStripDay}>
                      Workout Day <b>#{workoutDays}</b>
                    </span>
                    <span className={styles.medalStripCount}>MAX</span>
                  </div>
                  <div className={styles.medalStripRemaining}>
                    All tiers unlocked —{" "}
                    <span className={styles.medalStripNextName}>Diamond Legend</span>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        );

        if (!latest) {
          return (
            <section className={styles.reportBanner}>
              <div className={styles.reportHead}>
                <div className={styles.reportTitleWrap}>
                  <span className={styles.reportKicker}>Training Report</span>
                  <h3 className={styles.reportTitle}>No workouts yet</h3>
                </div>
              </div>
              {medalStrip}
              <p className={styles.reportEmpty}>
                Start a routine today to begin your journey to{" "}
                {trophyProgress.nextTier?.label ?? "glory"}.
              </p>
            </section>
          );
        }

        const todayReport = isToday(latest.date);
        const kicker = todayReport ? "Today's Training" : "Last Session";
        const totalReps = latest.exercises.reduce((a, ex) => {
          // setSummary is like "10 × 60 · 10 × 65 · ...", fall back to sets count
          const parts = ex.setSummary ? ex.setSummary.split(" · ") : [];
          return a + parts.reduce((rs, p) => {
            const n = parseInt(p, 10);
            return rs + (isNaN(n) ? 0 : n);
          }, 0);
        }, 0);

        return (
          <section className={styles.reportBanner}>
            <div className={styles.reportHead}>
              <div className={styles.reportTitleWrap}>
                <span className={styles.reportKicker}>{kicker}</span>
                <h3 className={styles.reportTitle}>
                  {latest.title}
                </h3>
                <span className={styles.reportDate}>
                  Workout #{latest.dayNumber}
                  {typeof latest.trainingDay === "number"
                    ? ` · Training Day ${latest.trainingDay}`
                    : ""} · {formatDate(latest.date)}
                </span>
              </div>
              <button
                type="button"
                className={styles.reportShareBtn}
                onClick={handleShare}
                aria-label="Share report"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 6l-4-4-4 4M12 2v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Share
              </button>
            </div>

            {medalStrip}

            <div className={styles.reportCalsRow}>
              <span className={styles.reportCalsNum}>{latest.totalCalories.toLocaleString()}</span>
              <span className={styles.reportCalsUnit}>kcal burned</span>
            </div>

            <div className={styles.reportGrid}>
              <div className={styles.reportStat}>
                <span className={styles.reportStatEmoji}>⏱️</span>
                <span className={styles.reportStatVal}>{formatDuration(latest.durationMins)}</span>
                <span className={styles.reportStatLbl}>Duration</span>
              </div>
              <div className={styles.reportStat}>
                <span className={styles.reportStatEmoji}>🏋️</span>
                <span className={styles.reportStatVal}>{latest.exercises.length}</span>
                <span className={styles.reportStatLbl}>Exercises</span>
              </div>
              <div className={styles.reportStat}>
                <span className={styles.reportStatEmoji}>📊</span>
                <span className={styles.reportStatVal}>{latest.totalSets}</span>
                <span className={styles.reportStatLbl}>Sets</span>
              </div>
              <div className={styles.reportStat}>
                <span className={styles.reportStatEmoji}>🔁</span>
                <span className={styles.reportStatVal}>{totalReps || "—"}</span>
                <span className={styles.reportStatLbl}>Reps</span>
              </div>
              <div className={styles.reportStat}>
                <span className={styles.reportStatEmoji}>💪</span>
                <span className={styles.reportStatVal}>{latest.totalVolume > 0 ? formatVolume(latest.totalVolume) : "—"}</span>
                <span className={styles.reportStatLbl}>Volume</span>
              </div>
              <div className={styles.reportStat}>
                <span className={styles.reportStatEmoji}>🔥</span>
                <span className={styles.reportStatVal}>{currentStreak}</span>
                <span className={styles.reportStatLbl}>Streak</span>
              </div>
            </div>

            {latest.exercises.length > 0 && (
              <div className={styles.reportExList}>
                {latest.exercises.slice(0, 4).map((ex, i) => (
                  <div key={i} className={styles.reportExRow}>
                    <span className={styles.reportExDot} />
                    <span className={styles.reportExName}>{ex.name}</span>
                    <span className={styles.reportExMeta}>
                      {ex.sets} set{ex.sets !== 1 ? "s" : ""}
                      {ex.setSummary ? ` · ${ex.setSummary.split(" · ")[0]}` : ""}
                    </span>
                  </div>
                ))}
                {latest.exercises.length > 4 && (
                  <div className={styles.reportExMore}>
                    +{latest.exercises.length - 4} more exercise{latest.exercises.length - 4 !== 1 ? "s" : ""}
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })()}

      <section className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <p className={styles.chartLabel}>{chartLabel}</p>
          <p className={styles.chartRange}>Last 4 weeks</p>
        </div>
        <div className={styles.bars}>
          {chartValues.map((val, i) => (
            <span
              key={i}
              className={styles.bar}
              style={{ height: `${Math.max((val / maxVal) * 112, val > 0 ? 8 : 0)}px` }}
            />
          ))}
        </div>
        <div className={styles.segmented}>
          {(["Duration", "Volume", "Reps"] as Segment[]).map((seg) => (
            <button
              key={seg}
              type="button"
              className={[styles.segBtn, activeSegment === seg ? styles.segActive : ""].join(" ")}
              onClick={() => handleSegment(seg)}
            >
              {seg}
            </button>
          ))}
        </div>
      </section>

      {/* ── Trophy Achievements ── */}
      <section className={styles.section}>
        <div className={styles.sectionLabel}>Trophies</div>

        {/* Progress indicator: days to next tier */}
        <div className={styles.trophyProgressCard}>
          <div className={styles.trophyProgressHead}>
            <div className={styles.trophyProgressCurrent}>
              {trophyProgress.currentTier ? (
                <>
                  <Image
                    src={trophyProgress.currentTier.image}
                    alt={trophyProgress.currentTier.label}
                    width={44}
                    height={44}
                    className={styles.trophyProgressIcon}
                    unoptimized
                  />
                  <div>
                    <span className={styles.trophyProgressKicker}>Current tier</span>
                    <span className={styles.trophyProgressTierName}>
                      {trophyProgress.currentTier.label}
                    </span>
                  </div>
                </>
              ) : (
                <div>
                  <span className={styles.trophyProgressKicker}>No tier yet</span>
                  <span className={styles.trophyProgressTierName}>Aim for Bronze</span>
                </div>
              )}
            </div>
            <div className={styles.trophyProgressDays}>
              <span className={styles.trophyProgressDaysNum}>{workoutDays}</span>
              <span className={styles.trophyProgressDaysLbl}>total days</span>
            </div>
          </div>

          <div className={styles.trophyBar}>
            <div
              className={styles.trophyBarFill}
              style={{ width: `${trophyProgress.segmentPercent}%` }}
            />
          </div>

          <div className={styles.trophyProgressFoot}>
            <span className={styles.trophyProgressNext}>{nextLabel}</span>
            {trophyProgress.nextTier && (
              <span className={styles.trophyProgressDelta}>
                {trophyProgress.daysIntoCurrent} / {trophyProgress.nextTier.threshold - (trophyProgress.currentTier?.threshold ?? 0)} days
              </span>
            )}
          </div>

          {/* Dot grid: one dot per required day in current tier segment */}
          {trophyProgress.nextTier && (() => {
            const segmentLength = trophyProgress.nextTier.threshold - (trophyProgress.currentTier?.threshold ?? 0);
            const filled = trophyProgress.daysIntoCurrent;
            return (
              <div
                className={styles.dotGrid}
                role="img"
                aria-label={`${filled} of ${segmentLength} days completed toward ${trophyProgress.nextTier.label}`}
              >
                {Array.from({ length: segmentLength }).map((_, i) => {
                  const isFilled = i < filled;
                  const isEdge = i === filled - 1;
                  return (
                    <span
                      key={i}
                      className={[
                        styles.dot,
                        isFilled ? styles.dotFilled : styles.dotEmpty,
                        isEdge ? styles.dotEdge : "",
                      ].filter(Boolean).join(" ")}
                      title={`Day ${i + 1}`}
                    />
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* 5-tier trophy cards */}
        <div className={styles.trophyGrid}>
          {TROPHIES.map((t) => {
            const unlocked = workoutDays >= t.threshold;
            const isNext = trophyProgress.nextTier?.tier === t.tier;
            return (
              <div
                key={t.tier}
                className={[
                  styles.trophyCard,
                  unlocked ? styles.trophyUnlocked : styles.trophyLocked,
                  isNext ? styles.trophyNext : "",
                ].filter(Boolean).join(" ")}
              >
                <div className={styles.trophyImgWrap}>
                  <Image
                    src={t.image}
                    alt={t.label}
                    width={84}
                    height={84}
                    className={styles.trophyImg}
                    unoptimized
                  />
                  {!unlocked && <span className={styles.trophyLockBadge}>🔒</span>}
                </div>
                <p className={styles.trophyLabel}>{t.label}</p>
                <p className={styles.trophyThreshold}>{t.threshold} days</p>
                <p className={styles.trophyBlurb}>{t.blurb}</p>
                {isNext && trophyProgress.daysRemaining > 0 && (
                  <span className={styles.trophyRemaining}>
                    {trophyProgress.daysRemaining}d left
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionLabel}>Appearance</div>
        <div className={styles.card}>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Theme</span>
            <div className={styles.themeToggle} role="radiogroup" aria-label="Theme">
              <button
                type="button"
                role="radio"
                aria-checked={theme === "light"}
                className={[styles.themeOpt, theme === "light" ? styles.themeOptActive : ""].join(" ")}
                onClick={() => setTheme("light")}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Light
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={theme === "dark"}
                className={[styles.themeOpt, theme === "dark" ? styles.themeOptActive : ""].join(" ")}
                onClick={() => setTheme("dark")}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                </svg>
                Dark
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionLabel}>Account</div>
        <div className={styles.card}>
          <button type="button" className={styles.rowBtn} onClick={openEdit}>
            <span className={styles.rowLabel}>Name</span>
            <span className={styles.rowValue}>{displayName}</span>
          </button>
          <div className={styles.separator} />
          <button type="button" className={styles.rowBtn} onClick={openEdit}>
            <span className={styles.rowLabel}>Username</span>
            <span className={styles.rowValue}>{displayUsername ? `@${displayUsername}` : "—"}</span>
          </button>
          <div className={styles.separator} />
          <div className={styles.row}>
            <span className={styles.rowLabel}>Email</span>
            <span className={styles.rowValue}>{displayEmail}</span>
          </div>
          <div className={styles.separator} />
          <div className={styles.row}>
            <span className={styles.rowLabel}>Member Since</span>
            <span className={styles.rowValue}>{joinDate}</span>
          </div>
        </div>
      </section>

      {loading && <div className={styles.loadingCenter}><Spinner size={24} /></div>}

      <div className={styles.logoutSection}>
        <Button variant="danger" fullWidth onClick={handleLogout} loading={loggingOut}>
          Log Out
        </Button>
      </div>
    </div>
  );
}
