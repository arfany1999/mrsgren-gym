"use client";

import Image from "next/image";
import styles from "./TrophyRing.module.css";

interface TrophyRingProps {
  /** Days completed within the current tier segment. */
  segCurrent: number;
  /** Days required to clear the current tier segment. */
  segTotal: number;
  /** Tier image (e.g. /trophies/bronze.svg). */
  trophySrc: string;
  /** UPPERCASE tier name (e.g. "BRONZE"). */
  tierName: string;
  /** Days to next tier ("50 DAYS TO SILVER") — already humanised. */
  caption: string;
}

/**
 * Centered trophy badge from the GYM123 home prototype: ambient glow,
 * tick-marked track, copper progress arc, and the trophy SVG floating
 * inside an inner halo. Pure presentational — caller computes progress.
 */
export function TrophyRing({ segCurrent, segTotal, trophySrc, tierName, caption }: TrophyRingProps) {
  const safeTotal = Math.max(1, segTotal);
  const pct = Math.min(1, Math.max(0, segCurrent / safeTotal));
  const r = 88;
  const c = 2 * Math.PI * r;
  const dash = c * pct;

  // Leading edge jewel position
  const angle = pct * 2 * Math.PI - Math.PI / 2;
  const jx = 100 + r * Math.cos(angle);
  const jy = 100 + r * Math.sin(angle);

  return (
    <div className={styles.wrap}>
      <div className={styles.glow} aria-hidden />
      <div className={styles.ring}>
        <svg width="200" height="200" viewBox="0 0 200 200" className={styles.svg} aria-hidden>
          <defs>
            <linearGradient id="trophyArcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#3D1F08" />
              <stop offset="18%"  stopColor="#8B5E3C" />
              <stop offset="35%"  stopColor="#CD7F32" />
              <stop offset="52%"  stopColor="#F5D97A" />
              <stop offset="65%"  stopColor="#FFE999" />
              <stop offset="78%"  stopColor="#D4A843" />
              <stop offset="100%" stopColor="#8B6914" />
            </linearGradient>
            <filter id="trophyArcGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="trophyArcGlow2" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="7" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Track grooves */}
          <circle cx="100" cy="100" r="88" fill="none" stroke="#0A0A12" strokeWidth="4" />
          <circle cx="100" cy="100" r="88" fill="none" stroke="#222236" strokeWidth="1" opacity="0.4" />

          {/* Tick marks */}
          {Array.from({ length: 60 }).map((_, i) => {
            const a = (i / 60) * 2 * Math.PI - Math.PI / 2;
            const isMajor = i % 5 === 0;
            const inner = isMajor ? 81 : 85.5;
            const outer = 88;
            const isDone = i < Math.round(pct * 60);
            return (
              <line
                key={i}
                x1={100 + inner * Math.cos(a)}
                y1={100 + inner * Math.sin(a)}
                x2={100 + outer * Math.cos(a)}
                y2={100 + outer * Math.sin(a)}
                stroke={isDone ? "#CD7F32" : "#1A1A2A"}
                strokeWidth={isMajor ? 1.5 : 0.75}
                opacity={isMajor ? 0.9 : 0.5}
              />
            );
          })}

          {/* Wide soft outer glow arc */}
          <circle
            cx="100" cy="100" r="88" fill="none"
            stroke="#CD7F32"
            strokeWidth="6"
            strokeDasharray={`${dash} ${c}`}
            transform="rotate(-90 100 100)"
            opacity="0.12"
            filter="url(#trophyArcGlow2)"
          />

          {/* Mid glow */}
          <circle
            cx="100" cy="100" r="88" fill="none"
            stroke="#E8C56D"
            strokeWidth="3"
            strokeDasharray={`${dash} ${c}`}
            transform="rotate(-90 100 100)"
            opacity="0.35"
            filter="url(#trophyArcGlow)"
          />

          {/* Main metallic arc */}
          <circle
            cx="100" cy="100" r="88" fill="none"
            stroke="url(#trophyArcGrad)"
            strokeWidth="2.5"
            strokeDasharray={`${dash} ${c}`}
            transform="rotate(-90 100 100)"
          />

          {/* Leading-edge jewel */}
          {pct > 0 && pct < 1 && (
            <>
              <circle cx={jx} cy={jy} r="5" fill="#FFE999" opacity="0.25" filter="url(#trophyArcGlow2)" />
              <circle cx={jx} cy={jy} r="2.5" fill="#FFF5CC" />
              <circle cx={jx} cy={jy} r="1.2" fill="white" />
            </>
          )}
        </svg>

        <div className={styles.innerGlow} aria-hidden />

        <Image
          src={trophySrc}
          alt={tierName}
          width={110}
          height={110}
          className={styles.trophy}
          unoptimized
          priority
        />
      </div>

      <div className={styles.labels}>
        <p className={styles.tier}>{tierName} TIER</p>
        <p className={styles.caption}>{caption}</p>
      </div>
    </div>
  );
}
