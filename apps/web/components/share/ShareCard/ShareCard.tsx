import { TROPHIES, getTrophyProgress, type TrophyTier } from "@/lib/trophies";
import { TIER_META } from "@/lib/tierMeta";
import styles from "./ShareCard.module.css";

export interface ShareCardData {
  /** First name shown above the duration. */
  name: string;
  /** Day-of-week label, e.g. "MON". */
  day: string;
  /** Date label, e.g. "OCT 12". */
  date: string;
  /** Duration formatted as "01:24:36" or "1h 24m". */
  duration: string;
  /** Total volume in kg. */
  volume: number;
  /** Number of exercises completed. */
  exercises: number;
  /** Cardio minutes (0 if none). */
  cardio: number;
  /** Estimated calories burned. */
  calories: number;
  /** Cumulative workout days (drives tier + ring progress). */
  workoutDays: number;
  /** Current streak in consecutive days. */
  streakDays: number;
}

interface Props {
  data: ShareCardData;
}

const G_FALLBACK = ["#D4A843", "#E8C56D", "#8B7335", "#6B3A1F"] as const;

export function ShareCard({ data }: Props) {
  const progress = getTrophyProgress(data.workoutDays);
  const earnedTier: TrophyTier = progress.currentTier?.tier ?? "bronze";
  const tierDef = progress.currentTier ?? TROPHIES[0]!;
  const G = (TIER_META[earnedTier]?.grad ?? G_FALLBACK) as readonly string[];

  const ringTotal = progress.nextTier?.threshold ?? tierDef.threshold;
  const ringFilled = Math.min(data.workoutDays / ringTotal, 1);
  const ringR = 51;
  const ringCirc = 2 * Math.PI * ringR;

  return (
    <div className={styles.card}>
      {/* Top edge accent */}
      <div
        className={styles.topEdge}
        style={{
          background: `linear-gradient(90deg, transparent, ${G[1]}80, ${G[0]}cc, ${G[1]}80, transparent)`,
        }}
      />

      {/* Corner brackets */}
      <div
        className={styles.corner}
        style={{
          top: 14,
          left: 14,
          borderTop: `1px solid ${G[0]}4D`,
          borderLeft: `1px solid ${G[0]}4D`,
        }}
      />
      <div
        className={styles.corner}
        style={{
          top: 14,
          right: 14,
          borderTop: `1px solid ${G[0]}4D`,
          borderRight: `1px solid ${G[0]}4D`,
        }}
      />
      <div
        className={styles.corner}
        style={{
          bottom: 14,
          left: 14,
          borderBottom: `1px solid ${G[0]}4D`,
          borderLeft: `1px solid ${G[0]}4D`,
        }}
      />
      <div
        className={styles.corner}
        style={{
          bottom: 14,
          right: 14,
          borderBottom: `1px solid ${G[0]}4D`,
          borderRight: `1px solid ${G[0]}4D`,
        }}
      />

      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <p className={styles.headerEyebrow}>GYM.MRGREN.STORE</p>
          <div>
            <p className={styles.headerMeta}>{data.day}</p>
            <p className={styles.headerMeta} style={{ marginTop: 2 }}>
              {data.date}
            </p>
          </div>
        </div>

        {/* Hero zone */}
        <div style={{ textAlign: "center" }}>
          <p className={styles.heroLbl}>WORKOUT COMPLETE</p>

          <div className={styles.nameRow}>
            <div className={styles.tierBadgeWrap}>
              <div
                className={styles.tierBadgeHalo}
                style={{
                  background: `radial-gradient(circle, ${G[0]}33, transparent 70%)`,
                }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={tierDef.image}
                alt={tierDef.label}
                className={styles.tierBadgeImg}
                style={{ filter: `drop-shadow(0 0 8px ${G[0]}cc)` }}
              />
            </div>
            <h1 className={styles.heroName}>{data.name}</h1>
          </div>

          <div className={styles.duration}>{data.duration}</div>
          <p className={styles.durationLbl}>DURATION</p>

          <div className={styles.statRow}>
            <div className={styles.statCol}>
              <p className={styles.statLbl}>VOLUME</p>
              <p className={styles.statValue}>{data.volume.toLocaleString()}</p>
              <p className={styles.statUnit}>KG</p>
            </div>
            <div className={styles.statCol}>
              <p className={styles.statLbl}>EXERCISES</p>
              <p className={styles.statValue}>{data.exercises}</p>
            </div>
            <div className={styles.statCol}>
              <p className={styles.statLbl}>CARDIO</p>
              <p className={styles.statValue}>{data.cardio}</p>
              {data.cardio > 0 && <p className={styles.statUnit}>MIN</p>}
            </div>
          </div>
        </div>

        {/* Session summary */}
        <div
          className={styles.summary}
          style={{
            borderTop: `1px solid ${G[0]}30`,
            borderBottom: `1px solid ${G[0]}30`,
          }}
        >
          <div className={styles.summaryHead}>
            <div
              className={styles.summaryTick}
              style={{
                background: `linear-gradient(180deg, ${G[0]}, ${G[2]})`,
              }}
            />
            <p className={styles.summaryLbl} style={{ color: G[0] }}>
              SESSION SUMMARY
            </p>
          </div>
          <div className={styles.summaryRow}>
            <div className={styles.summaryCell}>
              <p className={styles.summaryCellValue}>{data.exercises}</p>
              <p className={styles.summaryCellLbl}>EXERCISES DONE</p>
            </div>
            <div className={styles.summaryCell}>
              <p className={styles.summaryCellValue}>{data.volume.toLocaleString()}</p>
              <p className={styles.summaryCellUnit}>KG</p>
              <p className={styles.summaryCellLbl}>TOTAL VOLUME</p>
            </div>
            <div className={styles.summaryCell}>
              <p className={styles.summaryCellValue}>{data.calories}</p>
              <p className={styles.summaryCellUnit}>KCAL</p>
              <p className={styles.summaryCellLbl}>CALORIES BURNED</p>
            </div>
          </div>
        </div>

        {/* Tier + streak footer */}
        <div
          className={styles.tierFooter}
          style={{ borderTop: `1px solid ${G[0]}26` }}
        >
          <div style={{ flexShrink: 0, textAlign: "center" }}>
            <span className={styles.streakNum}>{data.streakDays}</span>
            <span className={styles.streakLbl}>
              DAY
              <br />
              STREAK
            </span>
          </div>

          <div className={styles.ringWrap}>
            <svg
              className={styles.ringSvg}
              width={120}
              height={120}
              viewBox="0 0 120 120"
            >
              <circle
                cx={60}
                cy={60}
                r={ringR}
                fill="none"
                stroke="rgba(255,255,255,0.04)"
                strokeWidth={2.5}
              />
              <circle
                cx={60}
                cy={60}
                r={ringR}
                fill="none"
                stroke={G[0]}
                strokeWidth={2.5}
                strokeDasharray={`${(ringCirc * ringFilled).toFixed(2)} ${ringCirc.toFixed(2)}`}
                strokeLinecap="square"
                transform="rotate(-90 60 60)"
                style={{ filter: `drop-shadow(0 0 4px ${G[0]}cc)` }}
              />
              <line
                x1={60}
                y1={9}
                x2={60}
                y2={15}
                stroke={G[0]}
                strokeWidth={1.5}
                opacity={0.5}
              />
            </svg>
            <div
              className={styles.ringHalo}
              style={{
                background: `radial-gradient(circle, ${G[0]}1F, transparent 70%)`,
              }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={tierDef.image}
              alt={tierDef.label}
              className={styles.ringTrophy}
              style={{ filter: `drop-shadow(0 0 6px ${G[0]}99)` }}
            />
          </div>

          <div style={{ flexShrink: 0, textAlign: "center" }}>
            <span className={styles.tierName} style={{ color: G[0] }}>
              {tierDef.label.toUpperCase()}
            </span>
            <p className={styles.tierMeta}>
              {data.workoutDays} / {ringTotal} DAYS
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
