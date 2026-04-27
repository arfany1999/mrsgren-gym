"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { TROPHIES, type TrophyDef } from "@/lib/trophies";
import { TIER_META, type TierMeta } from "@/lib/tierMeta";
import styles from "./TierProgression.module.css";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  isRect: boolean;
  color: string;
  opacity: number;
  rotation: number;
  rotSpeed: number;
  delay: number;
  gravity: number;
}

interface Props {
  /** Cumulative unique workout days for the current user. */
  currentDay: number;
}

// Combine the data tier with its visual metadata for rendering.
type TierView = TrophyDef & TierMeta;

const TIER_VIEWS: TierView[] = TROPHIES.map((t) => ({ ...t, ...TIER_META[t.tier] }));

function alpha(rgba: string, a: number): string {
  // Convert "rgba(r, g, b, _) " to "rgba(r, g, b, a)" so we can reuse the same
  // glow color at different intensities without holding 3 copies in metadata.
  const m = rgba.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) return rgba;
  return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${a})`;
}

export function TierProgression({ currentDay }: Props) {
  const day = Math.max(0, Math.floor(currentDay));

  // Default selection: the user's current/in-progress tier.
  const initialSelection = useMemo(() => {
    const idx = TIER_VIEWS.findIndex((t) => day < t.threshold);
    return idx === -1 ? TIER_VIEWS.length - 1 : idx;
  }, [day]);

  const [sel, setSel] = useState(initialSelection);
  const [unlockAnim, setUnlockAnim] = useState(false);
  const [confetti, setConfetti] = useState<Particle[]>([]);
  const [rays, setRays] = useState(false);
  const [flash, setFlash] = useState(false);
  const [shake, setShake] = useState(false);
  const [counter, setCounter] = useState<number | null>(null);
  const prevDay = useRef(day);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const t = TIER_VIEWS[sel]!;
  const unlocked = day >= t.threshold;
  const isCurrent = !unlocked && (sel === 0 || day >= TIER_VIEWS[sel - 1]!.threshold);
  const pct = Math.min(day / t.threshold, 1);

  const triggerCelebration = useCallback(() => {
    setFlash(true);
    setShake(true);
    const flashTimer = setTimeout(() => setFlash(false), 400);
    const shakeTimer = setTimeout(() => setShake(false), 600);
    const raysOn = setTimeout(() => {
      setRays(true);
      setUnlockAnim(true);
    }, 200);
    const raysOff = setTimeout(() => setRays(false), 2500);
    const animOff = setTimeout(() => setUnlockAnim(false), 3000);

    const particles: Particle[] = [];
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = 3 + Math.random() * 8;
      const size = 3 + Math.random() * 6;
      particles.push({
        x: 50,
        y: 40,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - 2,
        size,
        isRect: Math.random() > 0.5,
        color: t.grad[Math.floor(Math.random() * t.grad.length)]!,
        opacity: 1,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 15,
        delay: Math.random() * 300,
        gravity: 0.15 + Math.random() * 0.1,
      });
    }
    setConfetti(particles);

    let count = 0;
    const target = t.threshold;
    const step = Math.max(1, Math.floor(target / 60));
    setCounter(0);
    const interval = setInterval(() => {
      count += step;
      if (count >= target) {
        count = target;
        clearInterval(interval);
        setTimeout(() => setCounter(null), 1000);
      }
      setCounter(count);
    }, 25);
    const fadeOut = setTimeout(() => setConfetti([]), 3500);

    return () => {
      clearTimeout(flashTimer);
      clearTimeout(shakeTimer);
      clearTimeout(raysOn);
      clearTimeout(raysOff);
      clearTimeout(animOff);
      clearTimeout(fadeOut);
      clearInterval(interval);
    };
  }, [t]);

  // Auto-celebrate when the user crosses the currently-selected tier threshold.
  useEffect(() => {
    const prev = prevDay.current;
    prevDay.current = day;
    if (prev < t.threshold && day >= t.threshold) triggerCelebration();
  }, [day, t, triggerCelebration]);

  // Confetti renderer.
  useEffect(() => {
    if (confetti.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);

    const particles = confetti.map((p) => ({ ...p }));
    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      let alive = false;
      for (const p of particles) {
        if (p.delay > 0) {
          p.delay -= 16;
          continue;
        }
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.99;
        p.opacity -= 0.008;
        p.rotation += p.rotSpeed;
        if (p.opacity <= 0) continue;
        alive = true;
        ctx.save();
        ctx.globalAlpha = p.opacity;
        const px = (p.x / 100) * canvas.offsetWidth;
        const py = (p.y / 100) * canvas.offsetHeight;
        ctx.translate(px, py);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        if (p.isRect) ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      if (alive) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [confetti]);

  return (
    <div className={styles.root} data-shake={shake}>
      {flash && <div className={styles.flash} />}
      <canvas ref={canvasRef} className={styles.canvas} />

      {counter !== null && (
        <div className={styles.counterOverlay}>
          <div>
            <p
              className={styles.counterNum}
              style={{
                color: t.grad[0],
                textShadow: `0 0 40px ${t.glow}, 0 0 80px ${t.glow}`,
              }}
            >
              {counter}
            </p>
            <p className={styles.counterLbl} style={{ color: t.grad[1] }}>
              DAYS ACHIEVED
            </p>
          </div>
        </div>
      )}

      <p className={styles.eyebrow}>EARNED · NOT · GIVEN</p>
      <h2 className={styles.heading}>TIER</h2>
      <div
        className={styles.headRule}
        style={{
          background: `linear-gradient(90deg, transparent, ${unlocked ? t.grad[0] : "#303038"}, transparent)`,
        }}
      />

      {/* Tier selector row */}
      <div className={styles.tierRow}>
        {TIER_VIEWS.map((tier, i) => {
          const u = day >= tier.threshold;
          const cur = !u && (i === 0 || day >= TIER_VIEWS[i - 1]!.threshold);
          const state = u ? "unlocked" : cur ? "current" : "locked";
          return (
            <button
              key={tier.tier}
              type="button"
              className={styles.tierBtn}
              style={{
                borderBottomColor:
                  sel === i ? (u ? tier.grad[0] : "#505058") : "transparent",
              }}
              onClick={() => setSel(i)}
            >
              <div
                className={styles.tierCircle}
                data-state={state}
                style={{
                  background: u
                    ? `radial-gradient(circle at 35% 30%, ${alpha(tier.glow, 0.31)}, ${alpha(tier.glow, 0.18)})`
                    : "transparent",
                  border: `1px solid ${u ? alpha(tier.glow, 0.38) : cur ? alpha(tier.glow, 0.18) : "#1A1A22"}`,
                  boxShadow: cur
                    ? `0 0 0 3px ${alpha(tier.glow, 0.09)}`
                    : u
                      ? `0 0 16px ${alpha(tier.glow, 0.25)}`
                      : "none",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={tier.image}
                  alt={tier.label}
                  width={28}
                  height={28}
                  style={{
                    width: 28,
                    height: 28,
                    objectFit: "contain",
                    opacity: u ? 1 : cur ? 0.9 : 0.6,
                    transition: "opacity 0.4s",
                  }}
                />
              </div>
              <p
                className={styles.tierName}
                style={{
                  color:
                    sel === i
                      ? u
                        ? tier.grad[0]
                        : cur
                          ? "#888890"
                          : "#505058"
                      : "#1A1A22",
                }}
              >
                {tier.label.toUpperCase()}
              </p>
            </button>
          );
        })}
      </div>

      {/* Main badge */}
      <div className={styles.badge} key={`${sel}-${unlocked}`}>
        {(rays || unlocked) && (
          <div
            className={styles.rays}
            style={{ opacity: rays ? 0.5 : 0.08 }}
            aria-hidden
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: 2,
                  height: 130,
                  background: `linear-gradient(180deg, ${alpha(t.glow, 0.25)}, transparent)`,
                  transformOrigin: "top center",
                  transform: `translateX(-50%) rotate(${i * 30}deg)`,
                }}
              />
            ))}
          </div>
        )}
        {unlocked && (
          <div
            className={styles.glow}
            style={{
              background: `radial-gradient(circle, ${alpha(t.glow, 0.18)}, transparent 70%)`,
            }}
          />
        )}

        <div
          className={styles.badgeRing}
          data-anim={unlockAnim}
          style={{
            background: unlocked
              ? `radial-gradient(circle at 35% 30%, ${alpha(t.glow, 0.15)}, ${alpha(t.glow, 0.09)}, transparent)`
              : "transparent",
            border: `1px solid ${unlocked ? alpha(t.glow, 0.25) : isCurrent ? alpha(t.glow, 0.15) : "#15151E"}`,
            boxShadow: unlocked
              ? `0 0 30px ${t.glow}, inset 0 0 20px ${alpha(t.glow, 0.06)}`
              : "none",
          }}
        >
          {unlocked && (
            <div
              className={styles.shimmer}
              style={{
                background: `linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%)`,
              }}
            />
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={t.image}
            alt={t.label}
            width={96}
            height={96}
            className={styles.badgeImg}
            style={{
              opacity: unlocked ? 1 : isCurrent ? 0.85 : 0.65,
              filter: unlocked ? `drop-shadow(0 0 12px ${t.glow})` : "none",
            }}
          />
        </div>

        <p
          className={styles.statusLbl}
          style={{
            color: unlocked ? t.grad[0] : isCurrent ? "#888890" : "#2A2A30",
          }}
        >
          {unlocked ? "UNLOCKED" : isCurrent ? "IN PROGRESS" : "LOCKED"}
        </p>
        <h3
          className={styles.tierTitle}
          style={{
            color: unlocked ? "#E8E8EC" : isCurrent ? "#C0C0C8" : "#404048",
          }}
        >
          {t.label.toUpperCase()}
        </h3>
        <p className={styles.desc}>{t.desc}</p>
      </div>

      {/* Quote */}
      <div className={styles.quote}>
        <p className={styles.quoteText}>&ldquo;{t.quote}&rdquo;</p>
      </div>

      {/* Progress bar */}
      <div className={styles.progressWrap}>
        <div className={styles.progressMeta}>
          <span>{unlocked ? "COMPLETE" : `${Math.max(t.threshold - day, 0)} DAYS LEFT`}</span>
          <span>{Math.round(pct * 100)}%</span>
        </div>
        <div className={styles.progressTrack}>
          <div
            className={styles.progressFill}
            data-unlocked={unlocked}
            style={{
              width: `${pct * 100}%`,
              background: `linear-gradient(90deg, ${t.grad[2]}, ${t.grad[0]}, ${t.grad[1]})`,
            }}
          >
            {unlocked && (
              <div
                className={styles.progressDot}
                style={{
                  background: t.grad[0],
                  boxShadow: `0 0 10px ${t.glow}`,
                }}
              />
            )}
          </div>
        </div>
        <div className={styles.scaleRow}>
          <span style={{ color: "#202028" }}>0</span>
          <span style={{ color: unlocked ? t.grad[2] : "#202028" }}>{t.threshold}d</span>
        </div>
      </div>

      {/* Rewards */}
      <div className={styles.rewards}>
        <p className={styles.rewardsLbl}>UNLOCKED REWARDS</p>
        {t.rewards.map((r, i) => (
          <div key={i} className={styles.rewardRow}>
            <div
              className={styles.rewardDot}
              style={{
                background: unlocked ? t.grad[0] : "#12121A",
                boxShadow: unlocked ? `0 0 8px ${alpha(t.glow, 0.25)}` : "none",
              }}
            />
            <span
              className={styles.rewardLbl}
              style={{ color: unlocked ? "#909098" : "#202028" }}
            >
              {r}
            </span>
            {unlocked && (
              <span className={styles.rewardActive} style={{ color: t.grad[0] }}>
                ACTIVE
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
