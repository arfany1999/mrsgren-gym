"use client";

import { useEffect, useRef } from "react";
import styles from "./WorkoutReport.module.css";

/**
 * Background particle field for the workout-report screen. ~55 dim
 * gold-coloured pixels drift upward and respawn at the bottom — pure
 * decoration, motion is muted enough to be tasteful behind real content.
 * The colour is configurable so future themes can re-tint it.
 */
export function ParticlesCanvas({ color }: { color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const setSize = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    setSize();

    const W = () => canvas.offsetWidth;
    const H = () => canvas.offsetHeight;
    const particles = Array.from({ length: 55 }, () => ({
      x: Math.random() * W(),
      y: Math.random() * H(),
      s: 0.4 + Math.random() * 1.4,
      vx: (Math.random() - 0.5) * 0.12,
      vy: -0.08 - Math.random() * 0.25,
      o: 0.04 + Math.random() * 0.14,
      ph: Math.random() * Math.PI * 2,
    }));

    let frame = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W(), H());
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.ph += 0.008;
        if (p.y < -4) {
          p.y = H() + 4;
          p.x = Math.random() * W();
        }
        ctx.globalAlpha = p.o * (0.35 + 0.65 * Math.sin(p.ph));
        ctx.fillStyle = color;
        ctx.fillRect(p.x, p.y, p.s, p.s);
      });
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    const onResize = () => setSize();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, [color]);

  return <canvas ref={canvasRef} className={styles.particles} aria-hidden />;
}
