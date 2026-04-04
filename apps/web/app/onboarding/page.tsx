"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { saveProfile, getProfile, type Sex, type ActivityLevel } from "@/lib/gymProfile";
import styles from "./page.module.css";

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; desc: string }[] = [
  { value: "sedentary",   label: "Sedentary",         desc: "Little to no exercise"           },
  { value: "light",       label: "Lightly Active",    desc: "Exercise 1–3 days / week"         },
  { value: "moderate",    label: "Moderately Active",  desc: "Exercise 3–5 days / week"         },
  { value: "very_active", label: "Very Active",        desc: "Hard exercise 6–7 days / week"    },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, status } = useAuth();

  // Form state
  const [sex,           setSex]           = useState<Sex>("male");
  const [age,           setAge]           = useState("");
  const [weightVal,     setWeightVal]     = useState("");
  const [weightUnit,    setWeightUnit]    = useState<"kg" | "lbs">("kg");
  const [heightCm,      setHeightCm]      = useState("");
  const [heightFt,      setHeightFt]      = useState("");
  const [heightIn,      setHeightIn]      = useState("");
  const [heightUnit,    setHeightUnit]    = useState<"cm" | "ftin">("cm");
  const [activity,      setActivity]      = useState<ActivityLevel>("moderate");
  const [step,          setStep]          = useState(0);  // 0=intro,1=body,2=activity
  const [submitting,    setSubmitting]    = useState(false);

  // Redirect if already onboarded
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") { router.replace("/login"); return; }
    const email = user?.email;
    if (email && getProfile(email)) {
      router.replace("/dashboard");
    }
  }, [status, user, router]);

  function handleSubmit() {
    if (!user?.email) return;
    const ageNum = parseInt(age);
    if (!age || isNaN(ageNum) || ageNum < 10 || ageNum > 100) return;
    if (!weightVal) return;

    const wKg = weightUnit === "kg"
      ? parseFloat(weightVal)
      : parseFloat(weightVal) * 0.453592;

    let hCm: number;
    if (heightUnit === "cm") {
      hCm = parseFloat(heightCm) || 170;
    } else {
      const ft = parseFloat(heightFt) || 5;
      const inches = parseFloat(heightIn) || 7;
      hCm = (ft * 12 + inches) * 2.54;
    }

    const profileData = {
      sex,
      age: ageNum,
      weight_kg: Math.round(wKg * 10) / 10,
      height_cm: Math.round(hCm),
      activity_level: activity,
      onboarding_done: true as const,
    };

    setSubmitting(true);
    saveProfile(user.email, profileData);

    // Notify owner — fire-and-forget (don't block navigation on failure)
    fetch("/api/notify-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, ...profileData }),
    }).catch(() => {/* ignore */});

    router.replace("/dashboard");
  }

  if (status === "loading") return null;

  return (
    <div className={styles.page}>
      {/* Background gradient blobs */}
      <div className={styles.blob1} />
      <div className={styles.blob2} />

      <div className={styles.card}>
        {/* Progress dots */}
        <div className={styles.dots}>
          {[0, 1, 2].map(i => (
            <div key={i} className={[styles.dot, step >= i ? styles.dotActive : ""].join(" ")} />
          ))}
        </div>

        {/* ── Step 0: Welcome ── */}
        {step === 0 && (
          <div className={styles.stepWrap}>
            <div className={styles.heroEmoji}>🏋️</div>
            <h1 className={styles.heroTitle}>Welcome to<br />GYM Tracker</h1>
            <p className={styles.heroSub}>
              Let's set up your profile so we can calculate your estimated calorie burn during workouts.
            </p>
            <button className={styles.nextBtn} onClick={() => setStep(1)}>
              Get Started
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )}

        {/* ── Step 1: Body stats ── */}
        {step === 1 && (
          <div className={styles.stepWrap}>
            <h2 className={styles.stepTitle}>About You</h2>
            <p className={styles.stepSub}>Used for accurate calorie calculations</p>

            {/* Sex */}
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Biological Sex</label>
              <div className={styles.segmented}>
                {(["male", "female"] as Sex[]).map(s => (
                  <button
                    key={s}
                    type="button"
                    className={[styles.seg, sex === s ? styles.segActive : ""].join(" ")}
                    onClick={() => setSex(s)}
                  >
                    {s === "male" ? "♂ Male" : "♀ Female"}
                  </button>
                ))}
              </div>
            </div>

            {/* Age */}
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Age</label>
              <div className={styles.inputRow}>
                <input
                  className={styles.numInput}
                  type="tel" inputMode="numeric"
                  placeholder="25"
                  value={age}
                  onChange={e => setAge(e.target.value)}
                />
                <span className={styles.unit}>years</span>
              </div>
            </div>

            {/* Weight */}
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Body Weight</label>
              <div className={styles.inputRow}>
                <input
                  className={styles.numInput}
                  type="tel" inputMode="decimal"
                  placeholder={weightUnit === "kg" ? "75" : "165"}
                  value={weightVal}
                  onChange={e => setWeightVal(e.target.value)}
                />
                <div className={styles.unitToggle}>
                  {(["kg", "lbs"] as const).map(u => (
                    <button key={u} type="button"
                      className={[styles.unitBtn, weightUnit === u ? styles.unitBtnActive : ""].join(" ")}
                      onClick={() => setWeightUnit(u)}
                    >{u}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Height */}
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Height</label>
              {heightUnit === "cm" ? (
                <div className={styles.inputRow}>
                  <input
                    className={styles.numInput}
                    type="tel" inputMode="numeric"
                    placeholder="175"
                    value={heightCm}
                    onChange={e => setHeightCm(e.target.value)}
                  />
                  <div className={styles.unitToggle}>
                    <button type="button" className={[styles.unitBtn, styles.unitBtnActive].join(" ")} onClick={() => setHeightUnit("cm")}>cm</button>
                    <button type="button" className={styles.unitBtn} onClick={() => setHeightUnit("ftin")}>ft</button>
                  </div>
                </div>
              ) : (
                <div className={styles.inputRow}>
                  <input className={styles.numInput} style={{ maxWidth: 72 }}
                    type="tel" inputMode="numeric" placeholder="5"
                    value={heightFt} onChange={e => setHeightFt(e.target.value)} />
                  <span className={styles.unit}>ft</span>
                  <input className={styles.numInput} style={{ maxWidth: 72 }}
                    type="tel" inputMode="numeric" placeholder="9"
                    value={heightIn} onChange={e => setHeightIn(e.target.value)} />
                  <div className={styles.unitToggle}>
                    <button type="button" className={styles.unitBtn} onClick={() => setHeightUnit("cm")}>cm</button>
                    <button type="button" className={[styles.unitBtn, styles.unitBtnActive].join(" ")} onClick={() => setHeightUnit("ftin")}>ft</button>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.stepBtns}>
              <button className={styles.backBtn} type="button" onClick={() => setStep(0)}>Back</button>
              <button
                className={styles.nextBtn}
                type="button"
                disabled={!age || !weightVal}
                onClick={() => setStep(2)}
              >
                Next
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Activity level ── */}
        {step === 2 && (
          <div className={styles.stepWrap}>
            <h2 className={styles.stepTitle}>Activity Level</h2>
            <p className={styles.stepSub}>How often do you exercise outside of this app?</p>

            <div className={styles.activityList}>
              {ACTIVITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={[styles.activityCard, activity === opt.value ? styles.activityCardActive : ""].join(" ")}
                  onClick={() => setActivity(opt.value)}
                >
                  <div className={styles.activityCardInner}>
                    <span className={styles.activityLabel}>{opt.label}</span>
                    <span className={styles.activityDesc}>{opt.desc}</span>
                  </div>
                  {activity === opt.value && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" fill="var(--accent)"/>
                      <path d="M7 12l4 4 6-7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>

            <div className={styles.stepBtns}>
              <button className={styles.backBtn} type="button" onClick={() => setStep(1)}>Back</button>
              <button
                className={styles.nextBtn}
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
              >
                {submitting ? "Saving…" : "Let's Go 🔥"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
