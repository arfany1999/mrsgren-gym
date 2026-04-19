"use client";

import { useEffect, useRef } from "react";
import { BodyChart, ViewSide, type BodyState } from "body-muscles";
import styles from "./BodyMuscleIcon.module.css";

interface Props {
  muscles: string[];
  variant?: "full" | "thumb";
  /**
   * Optional override that pins the highlighted muscle IDs directly, bypassing
   * the coarse `muscles` → IDs lookup. Use this when a caller has already
   * classified the exercise into a sub-region (e.g. upper vs lower chest).
   */
  overrideIds?: { front?: string[]; back?: string[] };
}

const FRONT_IDS: Record<string, string[]> = {
  chest: ["chest-upper-left", "chest-upper-right", "chest-lower-left", "chest-lower-right"],
  pectorals: ["chest-upper-left", "chest-upper-right", "chest-lower-left", "chest-lower-right"],
  shoulders: ["shoulder-front-left", "shoulder-front-right", "shoulder-side-left", "shoulder-side-right"],
  delts: ["shoulder-front-left", "shoulder-front-right", "shoulder-side-left", "shoulder-side-right"],
  deltoids: ["shoulder-front-left", "shoulder-front-right", "shoulder-side-left", "shoulder-side-right"],
  biceps: ["biceps-left", "biceps-right"],
  forearms: ["forearm-left", "forearm-right", "forearm-flexors-left", "forearm-flexors-right"],
  abs: ["abs-upper-left", "abs-upper-right", "abs-lower-left", "abs-lower-right"],
  abdominals: ["abs-upper-left", "abs-upper-right", "abs-lower-left", "abs-lower-right"],
  core: [
    "abs-upper-left", "abs-upper-right", "abs-lower-left", "abs-lower-right",
    "obliques-left", "obliques-right",
  ],
  obliques: ["obliques-left", "obliques-right"],
  "serratus anterior": ["serratus-anterior-left", "serratus-anterior-right"],
  quads: ["quads-left", "quads-right"],
  quadriceps: ["quads-left", "quads-right"],
  adductors: ["adductors-left", "adductors-right"],
  "hip flexors": ["hip-flexor-left", "hip-flexor-right"],
  legs: [
    "quads-left", "quads-right",
    "adductors-left", "adductors-right",
    "tibialis-anterior-left", "tibialis-anterior-right",
  ],
};

const BACK_IDS: Record<string, string[]> = {
  back: [
    "lats-upper-left", "lats-mid-left", "lats-lower-left",
    "lats-upper-right", "lats-mid-right", "lats-lower-right",
    "lower-back-erectors-left", "lower-back-erectors-right",
  ],
  lats: [
    "lats-upper-left", "lats-mid-left", "lats-lower-left",
    "lats-upper-right", "lats-mid-right", "lats-lower-right",
  ],
  "upper back": ["traps-mid-left", "traps-mid-right", "lats-upper-left", "lats-upper-right"],
  "lower back": [
    "lower-back-erectors-left", "lower-back-ql-left",
    "lower-back-erectors-right", "lower-back-ql-right",
  ],
  spine: ["spine", "lower-back-erectors-left", "lower-back-erectors-right"],
  traps: [
    "traps-upper-left", "traps-mid-left", "traps-lower-left",
    "traps-upper-right", "traps-mid-right", "traps-lower-right",
  ],
  "levator scapulae": ["traps-upper-left", "traps-upper-right"],
  triceps: [
    "triceps-long-left", "triceps-lateral-left",
    "triceps-long-right", "triceps-lateral-right",
  ],
  glutes: [
    "gluteus-maximus-left", "gluteus-medius-left",
    "gluteus-maximus-right", "gluteus-medius-right",
  ],
  hamstrings: [
    "hamstrings-medial-left", "hamstrings-lateral-left",
    "hamstrings-medial-right", "hamstrings-lateral-right",
  ],
  calves: [
    "calves-gastroc-medial-left", "calves-gastroc-lateral-left", "calves-soleus-left",
    "calves-gastroc-medial-right", "calves-gastroc-lateral-right", "calves-soleus-right",
  ],
};

function resolve(muscles: string[]): { front: string[]; back: string[] } {
  const front = new Set<string>();
  const back = new Set<string>();
  for (const raw of muscles) {
    const key = raw.trim().toLowerCase();
    for (const id of FRONT_IDS[key] ?? []) front.add(id);
    for (const id of BACK_IDS[key] ?? []) back.add(id);
  }
  return { front: [...front], back: [...back] };
}

function buildState(ids: string[]): BodyState {
  const state: BodyState = {};
  for (const id of ids) state[id] = { intensity: 8, selected: true };
  return state;
}

function stripTitles(root: SVGSVGElement) {
  root.querySelectorAll("title").forEach((t) => t.remove());
}

function zoomToSelection(svg: SVGSVGElement, padRatio = 0.35) {
  const paths = svg.querySelectorAll<SVGPathElement>('path[aria-label*="(selected)"]');
  if (!paths.length) return;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  paths.forEach((p) => {
    const bb = p.getBBox();
    if (bb.width === 0 && bb.height === 0) return;
    minX = Math.min(minX, bb.x);
    minY = Math.min(minY, bb.y);
    maxX = Math.max(maxX, bb.x + bb.width);
    maxY = Math.max(maxY, bb.y + bb.height);
  });
  if (!isFinite(minX)) return;
  const w = maxX - minX;
  const h = maxY - minY;
  const size = Math.max(w, h);
  const padX = size * padRatio + (size - w) / 2;
  const padY = size * padRatio + (size - h) / 2;
  svg.setAttribute(
    "viewBox",
    `${minX - padX} ${minY - padY} ${w + padX * 2} ${h + padY * 2}`,
  );
}

function ChartView({
  view,
  ids,
  zoom = false,
}: {
  view: ViewSide;
  ids: string[];
  zoom?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const chart = useRef<BodyChart | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    chart.current = new BodyChart(ref.current, {
      view,
      bodyState: buildState(ids),
      enableTransitions: false,
    });
    const svg = ref.current.querySelector("svg") as SVGSVGElement | null;
    if (svg) {
      stripTitles(svg);
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      svg.style.cssText = "width:100%;height:100%;display:block";
      if (zoom) requestAnimationFrame(() => zoomToSelection(svg));
    }
    return () => {
      chart.current?.destroy();
      chart.current = null;
    };
  }, [view]);

  useEffect(() => {
    chart.current?.update({ bodyState: buildState(ids) });
    const svg = ref.current?.querySelector("svg") as SVGSVGElement | null;
    if (svg) {
      stripTitles(svg);
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      svg.style.cssText = "width:100%;height:100%;display:block";
      if (zoom) requestAnimationFrame(() => zoomToSelection(svg));
    }
  }, [ids, zoom]);

  return <div ref={ref} className={styles.chart} aria-hidden="true" />;
}

export function BodyMuscleIcon({ muscles, variant = "full", overrideIds }: Props) {
  const resolved = resolve(muscles);
  const front = overrideIds?.front?.length ? overrideIds.front : resolved.front;
  const back = overrideIds?.back?.length ? overrideIds.back : resolved.back;

  if (variant === "thumb") {
    const useBack = back.length > front.length;
    const ids = useBack ? back : front;
    const hasAny = ids.length > 0;
    return (
      <div className={styles.thumb} aria-hidden="true">
        {hasAny ? (
          <ChartView view={useBack ? ViewSide.BACK : ViewSide.FRONT} ids={ids} zoom />
        ) : (
          <ChartView view={ViewSide.FRONT} ids={front} />
        )}
      </div>
    );
  }

  return (
    <div className={styles.full} aria-hidden="true">
      <div className={styles.fullView}>
        <span className={styles.fullLabel}>Front</span>
        <ChartView view={ViewSide.FRONT} ids={front} />
      </div>
      <div className={styles.fullView}>
        <span className={styles.fullLabel}>Back</span>
        <ChartView view={ViewSide.BACK} ids={back} />
      </div>
    </div>
  );
}
