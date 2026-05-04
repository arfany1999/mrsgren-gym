// ── Pre-built workout program templates ───────────────────────
// Users can browse these and copy them into their own routines.
// All exercise names MUST match the curated list in exercises-data.ts.

export interface ProgramExercise {
  name: string;
  muscle: string;
  sets: number;
  reps: string; // "5" or "8-12" or "AMRAP" or "30s"
  measurementType:
    | "weight_reps"
    | "bodyweight_reps"
    | "timed"
    | "cardio"
    | "reps_only";
}

export interface ProgramDay {
  name: string; // "Push Day", "Day A", "Upper Body"
  exercises: ProgramExercise[];
}

export interface ProgramTemplate {
  id: string;
  name: string;
  description: string;
  level: "beginner" | "intermediate" | "advanced";
  daysPerWeek: number;
  goal: "strength" | "hypertrophy" | "general" | "powerlifting";
  days: ProgramDay[];
  tags: string[];
}

// ── Program data ──────────────────────────────────────────────

export const PROGRAM_TEMPLATES: ProgramTemplate[] = [
  // ─────────────────────────────────────────────────────────
  // 1. Push Pull Legs (PPL)
  // ─────────────────────────────────────────────────────────
  {
    id: "ppl",
    name: "Push Pull Legs (PPL)",
    description:
      "The classic 6-day split. Each muscle group is hit twice per week with dedicated push, pull, and leg days. Great for intermediate lifters chasing size.",
    level: "intermediate",
    daysPerWeek: 6,
    goal: "hypertrophy",
    days: [
      {
        name: "Push A",
        exercises: [
          { name: "Flat Barbell Bench Press",          muscle: "chest",     sets: 4, reps: "6-8",   measurementType: "weight_reps" },
          { name: "Incline Dumbbell Bench Press",      muscle: "chest",     sets: 3, reps: "8-10",  measurementType: "weight_reps" },
          { name: "Cable Fly (Mid)",                   muscle: "chest",     sets: 3, reps: "10-12", measurementType: "weight_reps" },
          { name: "Overhead Barbell Press",            muscle: "shoulders", sets: 4, reps: "6-8",   measurementType: "weight_reps" },
          { name: "Dumbbell Lateral Raise",            muscle: "shoulders", sets: 3, reps: "12-15", measurementType: "weight_reps" },
          { name: "Tricep Pushdown (Rope)",            muscle: "triceps",   sets: 3, reps: "10-12", measurementType: "weight_reps" },
          { name: "Overhead Cable Tricep Extension",   muscle: "triceps",   sets: 3, reps: "10-12", measurementType: "weight_reps" },
        ],
      },
      {
        name: "Pull A",
        exercises: [
          { name: "Barbell Bent-Over Row",             muscle: "back",    sets: 4, reps: "6-8",   measurementType: "weight_reps" },
          { name: "Wide-Grip Lat Pulldown",            muscle: "back",    sets: 3, reps: "8-10",  measurementType: "weight_reps" },
          { name: "Seated Cable Row (Close Grip)",     muscle: "back",    sets: 3, reps: "10-12", measurementType: "weight_reps" },
          { name: "Cable Face Pull",                   muscle: "back",    sets: 3, reps: "12-15", measurementType: "weight_reps" },
          { name: "Barbell Curl",                      muscle: "biceps",  sets: 3, reps: "8-10",  measurementType: "weight_reps" },
          { name: "Hammer Curl",                       muscle: "biceps",  sets: 3, reps: "10-12", measurementType: "weight_reps" },
        ],
      },
      {
        name: "Legs A",
        exercises: [
          { name: "Back Squat",                        muscle: "legs",    sets: 4, reps: "6-8",   measurementType: "weight_reps" },
          { name: "Romanian Deadlift",                 muscle: "legs",    sets: 3, reps: "8-10",  measurementType: "weight_reps" },
          { name: "Leg Press",                         muscle: "legs",    sets: 3, reps: "10-12", measurementType: "weight_reps" },
          { name: "Leg Curl",                          muscle: "legs",    sets: 3, reps: "10-12", measurementType: "weight_reps" },
          { name: "Leg Extension",                     muscle: "legs",    sets: 3, reps: "10-12", measurementType: "weight_reps" },
          { name: "Machine Calf Raise (Standing)",     muscle: "legs",    sets: 4, reps: "12-15", measurementType: "weight_reps" },
        ],
      },
      {
        name: "Push B",
        exercises: [
          { name: "Incline Barbell Bench Press",       muscle: "chest",     sets: 4, reps: "6-8",   measurementType: "weight_reps" },
          { name: "Flat Dumbbell Bench Press",         muscle: "chest",     sets: 3, reps: "8-10",  measurementType: "weight_reps" },
          { name: "Cable Fly (Low-to-High)",           muscle: "chest",     sets: 3, reps: "10-12", measurementType: "weight_reps" },
          { name: "Seated Dumbbell Shoulder Press",    muscle: "shoulders", sets: 4, reps: "8-10",  measurementType: "weight_reps" },
          { name: "Cable Lateral Raise",               muscle: "shoulders", sets: 3, reps: "12-15", measurementType: "weight_reps" },
          { name: "Tricep Pushdown (Straight Bar)",    muscle: "triceps",   sets: 3, reps: "10-12", measurementType: "weight_reps" },
          { name: "Overhead Dumbbell Tricep Extension", muscle: "triceps",  sets: 3, reps: "10-12", measurementType: "weight_reps" },
        ],
      },
      {
        name: "Pull B",
        exercises: [
          { name: "Barbell Bent-Over Row",             muscle: "back",    sets: 4, reps: "8-10",  measurementType: "weight_reps" },
          { name: "Close-Grip Lat Pulldown",           muscle: "back",    sets: 3, reps: "8-10",  measurementType: "weight_reps" },
          { name: "Seated Cable Row (Wide Grip)",      muscle: "back",    sets: 3, reps: "10-12", measurementType: "weight_reps" },
          { name: "Cable Face Pull",                   muscle: "back",    sets: 3, reps: "12-15", measurementType: "weight_reps" },
          { name: "EZ Bar Curl",                       muscle: "biceps",  sets: 3, reps: "8-10",  measurementType: "weight_reps" },
          { name: "Incline Dumbbell Curl",             muscle: "biceps",  sets: 3, reps: "10-12", measurementType: "weight_reps" },
        ],
      },
      {
        name: "Legs B",
        exercises: [
          { name: "Front Squat",                       muscle: "legs",    sets: 4, reps: "6-8",   measurementType: "weight_reps" },
          { name: "Conventional Deadlift",             muscle: "legs",    sets: 3, reps: "5",     measurementType: "weight_reps" },
          { name: "Hack Squat Machine",                muscle: "legs",    sets: 3, reps: "10-12", measurementType: "weight_reps" },
          { name: "Seated Leg Curl",                   muscle: "legs",    sets: 3, reps: "10-12", measurementType: "weight_reps" },
          { name: "Leg Extension",                     muscle: "legs",    sets: 3, reps: "12-15", measurementType: "weight_reps" },
          { name: "Machine Calf Raise (Seated)",       muscle: "legs",    sets: 4, reps: "12-15", measurementType: "weight_reps" },
        ],
      },
    ],
    tags: ["split", "6-day", "popular", "hypertrophy", "intermediate"],
  },

  // ─────────────────────────────────────────────────────────
  // 2. Upper Lower
  // ─────────────────────────────────────────────────────────
  {
    id: "upper-lower",
    name: "Upper Lower",
    description:
      "A balanced 4-day split alternating upper and lower body sessions. Good training frequency with built-in recovery days.",
    level: "intermediate",
    daysPerWeek: 4,
    goal: "hypertrophy",
    days: [
      {
        name: "Upper A",
        exercises: [
          { name: "Flat Barbell Bench Press",          muscle: "chest",     sets: 4, reps: "6-8",   measurementType: "weight_reps" },
          { name: "Barbell Bent-Over Row",             muscle: "back",      sets: 4, reps: "6-8",   measurementType: "weight_reps" },
          { name: "Overhead Barbell Press",            muscle: "shoulders", sets: 3, reps: "8-10",  measurementType: "weight_reps" },
          { name: "Dumbbell Lateral Raise",            muscle: "shoulders", sets: 3, reps: "12-15", measurementType: "weight_reps" },
          { name: "Barbell Curl",                      muscle: "biceps",    sets: 3, reps: "8-10",  measurementType: "weight_reps" },
          { name: "Tricep Pushdown (Rope)",            muscle: "triceps",   sets: 3, reps: "10-12", measurementType: "weight_reps" },
        ],
      },
      {
        name: "Lower A",
        exercises: [
          { name: "Back Squat",                        muscle: "legs",    sets: 4, reps: "6-8",   measurementType: "weight_reps" },
          { name: "Romanian Deadlift",                 muscle: "legs",    sets: 3, reps: "8-10",  measurementType: "weight_reps" },
          { name: "Leg Press",                         muscle: "legs",    sets: 3, reps: "10-12", measurementType: "weight_reps" },
          { name: "Leg Curl",                          muscle: "legs",    sets: 3, reps: "10-12", measurementType: "weight_reps" },
          { name: "Machine Calf Raise (Standing)",     muscle: "legs",    sets: 4, reps: "12-15", measurementType: "weight_reps" },
        ],
      },
      {
        name: "Upper B",
        exercises: [
          { name: "Incline Dumbbell Bench Press",      muscle: "chest",     sets: 4, reps: "8-10",  measurementType: "weight_reps" },
          { name: "Wide-Grip Lat Pulldown",            muscle: "back",      sets: 4, reps: "8-10",  measurementType: "weight_reps" },
          { name: "Seated Dumbbell Shoulder Press",    muscle: "shoulders", sets: 3, reps: "8-10",  measurementType: "weight_reps" },
          { name: "Dumbbell Rear Delt Fly",            muscle: "shoulders", sets: 3, reps: "12-15", measurementType: "weight_reps" },
          { name: "Hammer Curl",                       muscle: "biceps",    sets: 3, reps: "10-12", measurementType: "weight_reps" },
          { name: "Dumbbell Skull Crusher",            muscle: "triceps",   sets: 3, reps: "10-12", measurementType: "weight_reps" },
        ],
      },
      {
        name: "Lower B",
        exercises: [
          { name: "Conventional Deadlift",             muscle: "legs",    sets: 4, reps: "5",     measurementType: "weight_reps" },
          { name: "Front Squat",                       muscle: "legs",    sets: 3, reps: "8-10",  measurementType: "weight_reps" },
          { name: "Leg Extension",                     muscle: "legs",    sets: 3, reps: "10-12", measurementType: "weight_reps" },
          { name: "Barbell Hip Thrust",                muscle: "legs",    sets: 3, reps: "8-10",  measurementType: "weight_reps" },
          { name: "Machine Calf Raise (Seated)",       muscle: "legs",    sets: 4, reps: "12-15", measurementType: "weight_reps" },
        ],
      },
    ],
    tags: ["split", "4-day", "popular", "hypertrophy", "intermediate"],
  },

  // ─────────────────────────────────────────────────────────
  // 3. Starting Strength
  // ─────────────────────────────────────────────────────────
  {
    id: "starting-strength",
    name: "Starting Strength",
    description:
      "Mark Rippetoe's iconic beginner program. Alternating A/B days, 3 times per week. Simple, heavy, effective. Focus on linear progression with compound lifts.",
    level: "beginner",
    daysPerWeek: 3,
    goal: "strength",
    days: [
      {
        name: "Day A",
        exercises: [
          { name: "Back Squat",                        muscle: "legs",    sets: 3, reps: "5",  measurementType: "weight_reps" },
          { name: "Flat Barbell Bench Press",          muscle: "chest",   sets: 3, reps: "5",  measurementType: "weight_reps" },
          { name: "Conventional Deadlift",             muscle: "legs",    sets: 1, reps: "5",  measurementType: "weight_reps" },
        ],
      },
      {
        name: "Day B",
        exercises: [
          { name: "Back Squat",                        muscle: "legs",      sets: 3, reps: "5",  measurementType: "weight_reps" },
          { name: "Overhead Barbell Press",            muscle: "shoulders", sets: 3, reps: "5",  measurementType: "weight_reps" },
          { name: "Barbell Bent-Over Row",             muscle: "back",      sets: 5, reps: "5",  measurementType: "weight_reps" },
        ],
      },
    ],
    tags: ["beginner", "3-day", "strength", "compound", "linear progression", "popular"],
  },

  // ─────────────────────────────────────────────────────────
  // 4. 5/3/1 (Wendler)
  // ─────────────────────────────────────────────────────────
  {
    id: "531-wendler",
    name: "5/3/1 (Wendler)",
    description:
      "Jim Wendler's 5/3/1 program. Each day focuses on one main barbell lift with a 5/3/1 rep scheme, followed by supplemental and assistance work.",
    level: "intermediate",
    daysPerWeek: 4,
    goal: "powerlifting",
    days: [
      {
        name: "OHP Day",
        exercises: [
          { name: "Overhead Barbell Press",            muscle: "shoulders", sets: 3, reps: "5/3/1", measurementType: "weight_reps" },
          { name: "Flat Dumbbell Bench Press",         muscle: "chest",     sets: 5, reps: "10",    measurementType: "weight_reps" },
          { name: "Dumbbell Lateral Raise",            muscle: "shoulders", sets: 3, reps: "12-15", measurementType: "weight_reps" },
          { name: "Tricep Pushdown (Rope)",            muscle: "triceps",   sets: 3, reps: "10-12", measurementType: "weight_reps" },
        ],
      },
      {
        name: "Deadlift Day",
        exercises: [
          { name: "Conventional Deadlift",             muscle: "legs",    sets: 3, reps: "5/3/1", measurementType: "weight_reps" },
          { name: "Front Squat",                       muscle: "legs",    sets: 5, reps: "10",    measurementType: "weight_reps" },
          { name: "Leg Curl",                          muscle: "legs",    sets: 3, reps: "10-12", measurementType: "weight_reps" },
          { name: "Ab Wheel Rollout",                  muscle: "core",    sets: 3, reps: "10-15", measurementType: "reps_only"   },
        ],
      },
      {
        name: "Bench Day",
        exercises: [
          { name: "Flat Barbell Bench Press",          muscle: "chest",   sets: 3, reps: "5/3/1", measurementType: "weight_reps" },
          { name: "Incline Dumbbell Bench Press",      muscle: "chest",   sets: 5, reps: "10",    measurementType: "weight_reps" },
          { name: "Cable Fly (Mid)",                   muscle: "chest",   sets: 3, reps: "10-12", measurementType: "weight_reps" },
          { name: "Tricep Pushdown (Straight Bar)",    muscle: "triceps", sets: 3, reps: "10-12", measurementType: "weight_reps" },
        ],
      },
      {
        name: "Squat Day",
        exercises: [
          { name: "Back Squat",                        muscle: "legs",    sets: 3, reps: "5/3/1", measurementType: "weight_reps" },
          { name: "Romanian Deadlift",                 muscle: "legs",    sets: 5, reps: "10",    measurementType: "weight_reps" },
          { name: "Leg Press",                         muscle: "legs",    sets: 3, reps: "10-12", measurementType: "weight_reps" },
          { name: "Machine Calf Raise (Standing)",     muscle: "legs",    sets: 4, reps: "12-15", measurementType: "weight_reps" },
        ],
      },
    ],
    tags: ["powerlifting", "4-day", "popular", "intermediate", "5/3/1", "periodization"],
  },

  // ─────────────────────────────────────────────────────────
  // 5. PHUL (Power Hypertrophy Upper Lower)
  // ─────────────────────────────────────────────────────────
  {
    id: "phul",
    name: "PHUL (Power Hypertrophy Upper Lower)",
    description:
      "Combines heavy compound power days with higher-rep hypertrophy days. 4 days per week, hitting each muscle group twice with varied stimulus.",
    level: "intermediate",
    daysPerWeek: 4,
    goal: "hypertrophy",
    days: [
      {
        name: "Upper Power",
        exercises: [
          { name: "Flat Barbell Bench Press",          muscle: "chest",     sets: 3, reps: "5",    measurementType: "weight_reps" },
          { name: "Barbell Bent-Over Row",             muscle: "back",      sets: 3, reps: "5",    measurementType: "weight_reps" },
          { name: "Overhead Barbell Press",            muscle: "shoulders", sets: 3, reps: "5",    measurementType: "weight_reps" },
          { name: "Barbell Curl",                      muscle: "biceps",    sets: 2, reps: "8",    measurementType: "weight_reps" },
          { name: "Tricep Pushdown (Straight Bar)",    muscle: "triceps",   sets: 2, reps: "8",    measurementType: "weight_reps" },
        ],
      },
      {
        name: "Lower Power",
        exercises: [
          { name: "Back Squat",                        muscle: "legs",    sets: 3, reps: "5",    measurementType: "weight_reps" },
          { name: "Conventional Deadlift",             muscle: "legs",    sets: 3, reps: "5",    measurementType: "weight_reps" },
          { name: "Leg Press",                         muscle: "legs",    sets: 3, reps: "10",   measurementType: "weight_reps" },
          { name: "Leg Curl",                          muscle: "legs",    sets: 3, reps: "10",   measurementType: "weight_reps" },
          { name: "Machine Calf Raise (Standing)",     muscle: "legs",    sets: 4, reps: "10",   measurementType: "weight_reps" },
        ],
      },
      {
        name: "Upper Hypertrophy",
        exercises: [
          { name: "Incline Dumbbell Bench Press",      muscle: "chest",     sets: 3, reps: "12",   measurementType: "weight_reps" },
          { name: "Seated Cable Row (Close Grip)",     muscle: "back",      sets: 3, reps: "12",   measurementType: "weight_reps" },
          { name: "Dumbbell Lateral Raise",            muscle: "shoulders", sets: 3, reps: "15",   measurementType: "weight_reps" },
          { name: "Dumbbell Bicep Curl",               muscle: "biceps",    sets: 3, reps: "12",   measurementType: "weight_reps" },
          { name: "Tricep Pushdown (Rope)",            muscle: "triceps",   sets: 3, reps: "12",   measurementType: "weight_reps" },
        ],
      },
      {
        name: "Lower Hypertrophy",
        exercises: [
          { name: "Front Squat",                       muscle: "legs",    sets: 3, reps: "12",   measurementType: "weight_reps" },
          { name: "Romanian Deadlift",                 muscle: "legs",    sets: 3, reps: "12",   measurementType: "weight_reps" },
          { name: "Leg Extension",                     muscle: "legs",    sets: 3, reps: "15",   measurementType: "weight_reps" },
          { name: "Seated Leg Curl",                   muscle: "legs",    sets: 3, reps: "15",   measurementType: "weight_reps" },
          { name: "Machine Calf Raise (Seated)",       muscle: "legs",    sets: 4, reps: "15",   measurementType: "weight_reps" },
        ],
      },
    ],
    tags: ["split", "4-day", "popular", "hypertrophy", "strength", "intermediate", "power"],
  },

  // ─────────────────────────────────────────────────────────
  // 6. Bro Split
  // ─────────────────────────────────────────────────────────
  {
    id: "bro-split",
    name: "Bro Split",
    description:
      "The classic bodybuilding 5-day split. One muscle group per day, high volume, maximum pump. Each body part gets a full week to recover.",
    level: "beginner",
    daysPerWeek: 5,
    goal: "hypertrophy",
    days: [
      {
        name: "Chest Day",
        exercises: [
          { name: "Flat Barbell Bench Press",          muscle: "chest",   sets: 4, reps: "6-8",   measurementType: "weight_reps"    },
          { name: "Incline Dumbbell Bench Press",      muscle: "chest",   sets: 3, reps: "8-10",  measurementType: "weight_reps"    },
          { name: "Cable Fly (Mid)",                   muscle: "chest",   sets: 3, reps: "10-12", measurementType: "weight_reps"    },
          { name: "Dips",                              muscle: "chest",   sets: 3, reps: "AMRAP", measurementType: "bodyweight_reps" },
        ],
      },
      {
        name: "Back Day",
        exercises: [
          { name: "Barbell Bent-Over Row",             muscle: "back",    sets: 4, reps: "6-8",   measurementType: "weight_reps" },
          { name: "Wide-Grip Lat Pulldown",            muscle: "back",    sets: 3, reps: "8-10",  measurementType: "weight_reps" },
          { name: "Seated Cable Row (Close Grip)",     muscle: "back",    sets: 3, reps: "10-12", measurementType: "weight_reps" },
          { name: "Cable Face Pull",                   muscle: "back",    sets: 3, reps: "12-15", measurementType: "weight_reps" },
        ],
      },
      {
        name: "Shoulders Day",
        exercises: [
          { name: "Overhead Barbell Press",            muscle: "shoulders", sets: 4, reps: "6-8",   measurementType: "weight_reps" },
          { name: "Dumbbell Lateral Raise",            muscle: "shoulders", sets: 4, reps: "12-15", measurementType: "weight_reps" },
          { name: "Dumbbell Rear Delt Fly",            muscle: "shoulders", sets: 3, reps: "12-15", measurementType: "weight_reps" },
          { name: "Barbell Shrug (Shoulders)",         muscle: "shoulders", sets: 3, reps: "10-12", measurementType: "weight_reps" },
        ],
      },
      {
        name: "Arms Day",
        exercises: [
          { name: "Barbell Curl",                      muscle: "biceps",  sets: 3, reps: "8-10",  measurementType: "weight_reps" },
          { name: "Hammer Curl",                       muscle: "biceps",  sets: 3, reps: "10-12", measurementType: "weight_reps" },
          { name: "Tricep Pushdown (Rope)",            muscle: "triceps", sets: 3, reps: "10-12", measurementType: "weight_reps" },
          { name: "EZ Bar Skull Crusher",              muscle: "triceps", sets: 3, reps: "8-10",  measurementType: "weight_reps" },
        ],
      },
      {
        name: "Legs Day",
        exercises: [
          { name: "Back Squat",                        muscle: "legs",    sets: 4, reps: "6-8",   measurementType: "weight_reps" },
          { name: "Leg Press",                         muscle: "legs",    sets: 3, reps: "10-12", measurementType: "weight_reps" },
          { name: "Leg Curl",                          muscle: "legs",    sets: 3, reps: "10-12", measurementType: "weight_reps" },
          { name: "Machine Calf Raise (Standing)",     muscle: "legs",    sets: 4, reps: "12-15", measurementType: "weight_reps" },
        ],
      },
    ],
    tags: ["split", "5-day", "popular", "hypertrophy", "beginner", "bodybuilding"],
  },

  // ─────────────────────────────────────────────────────────
  // 7. Full Body 3x
  // ─────────────────────────────────────────────────────────
  {
    id: "full-body-3x",
    name: "Full Body 3x",
    description:
      "Three full-body sessions per week, each covering all major movement patterns. Perfect for beginners or anyone short on gym time. Alternating exercises keep it fresh.",
    level: "beginner",
    daysPerWeek: 3,
    goal: "general",
    days: [
      {
        name: "Day A",
        exercises: [
          { name: "Back Squat",                        muscle: "legs",      sets: 3, reps: "8-10",  measurementType: "weight_reps"    },
          { name: "Flat Barbell Bench Press",          muscle: "chest",     sets: 3, reps: "8-10",  measurementType: "weight_reps"    },
          { name: "Barbell Bent-Over Row",             muscle: "back",      sets: 3, reps: "8-10",  measurementType: "weight_reps"    },
          { name: "Dumbbell Lateral Raise",            muscle: "shoulders", sets: 2, reps: "12-15", measurementType: "weight_reps"    },
          { name: "Barbell Curl",                      muscle: "biceps",    sets: 2, reps: "10-12", measurementType: "weight_reps"    },
          { name: "Plank",                             muscle: "core",      sets: 3, reps: "30s",   measurementType: "timed"          },
        ],
      },
      {
        name: "Day B",
        exercises: [
          { name: "Conventional Deadlift",             muscle: "legs",      sets: 3, reps: "5",     measurementType: "weight_reps"    },
          { name: "Overhead Barbell Press",            muscle: "shoulders", sets: 3, reps: "8-10",  measurementType: "weight_reps"    },
          { name: "Wide-Grip Lat Pulldown",            muscle: "back",      sets: 3, reps: "8-10",  measurementType: "weight_reps"    },
          { name: "Incline Dumbbell Bench Press",      muscle: "chest",     sets: 3, reps: "8-10",  measurementType: "weight_reps"    },
          { name: "Tricep Pushdown (Rope)",            muscle: "triceps",   sets: 2, reps: "10-12", measurementType: "weight_reps"    },
          { name: "Hanging Knee Raise",                muscle: "core",      sets: 3, reps: "10-15", measurementType: "bodyweight_reps" },
        ],
      },
      {
        name: "Day C",
        exercises: [
          { name: "Front Squat",                       muscle: "legs",      sets: 3, reps: "8-10",  measurementType: "weight_reps"    },
          { name: "Flat Dumbbell Bench Press",         muscle: "chest",     sets: 3, reps: "8-10",  measurementType: "weight_reps"    },
          { name: "Seated Cable Row (Close Grip)",     muscle: "back",      sets: 3, reps: "10-12", measurementType: "weight_reps"    },
          { name: "Seated Dumbbell Shoulder Press",    muscle: "shoulders", sets: 3, reps: "8-10",  measurementType: "weight_reps"    },
          { name: "Hammer Curl",                       muscle: "biceps",    sets: 2, reps: "10-12", measurementType: "weight_reps"    },
          { name: "Machine Calf Raise (Standing)",     muscle: "legs",      sets: 3, reps: "12-15", measurementType: "weight_reps"    },
        ],
      },
    ],
    tags: ["full-body", "3-day", "popular", "general", "beginner", "time-efficient"],
  },

  // ─────────────────────────────────────────────────────────
  // 8. Arnold Split
  // ─────────────────────────────────────────────────────────
  {
    id: "arnold-split",
    name: "Arnold Split",
    description:
      "Arnold Schwarzenegger's legendary 6-day split: Chest+Back, Shoulders+Arms, Legs, repeated twice. High volume, high frequency, for advanced lifters chasing maximum muscle.",
    level: "advanced",
    daysPerWeek: 6,
    goal: "hypertrophy",
    days: [
      {
        name: "Chest + Back A",
        exercises: [
          { name: "Flat Barbell Bench Press",          muscle: "chest",   sets: 4, reps: "6-8",   measurementType: "weight_reps"    },
          { name: "Incline Dumbbell Bench Press",      muscle: "chest",   sets: 3, reps: "8-10",  measurementType: "weight_reps"    },
          { name: "Cable Fly (Mid)",                   muscle: "chest",   sets: 3, reps: "10-12", measurementType: "weight_reps"    },
          { name: "Pull-Up",                           muscle: "back",    sets: 4, reps: "AMRAP", measurementType: "bodyweight_reps" },
          { name: "Barbell Bent-Over Row",             muscle: "back",    sets: 4, reps: "6-8",   measurementType: "weight_reps"    },
          { name: "Seated Cable Row (Close Grip)",     muscle: "back",    sets: 3, reps: "10-12", measurementType: "weight_reps"    },
        ],
      },
      {
        name: "Shoulders + Arms A",
        exercises: [
          { name: "Overhead Barbell Press",            muscle: "shoulders", sets: 4, reps: "6-8",   measurementType: "weight_reps" },
          { name: "Dumbbell Lateral Raise",            muscle: "shoulders", sets: 4, reps: "12-15", measurementType: "weight_reps" },
          { name: "Dumbbell Rear Delt Fly",            muscle: "shoulders", sets: 3, reps: "12-15", measurementType: "weight_reps" },
          { name: "Barbell Curl",                      muscle: "biceps",    sets: 3, reps: "8-10",  measurementType: "weight_reps" },
          { name: "Hammer Curl",                       muscle: "biceps",    sets: 3, reps: "10-12", measurementType: "weight_reps" },
          { name: "Tricep Pushdown (Rope)",            muscle: "triceps",   sets: 3, reps: "10-12", measurementType: "weight_reps" },
          { name: "EZ Bar Skull Crusher",              muscle: "triceps",   sets: 3, reps: "8-10",  measurementType: "weight_reps" },
        ],
      },
      {
        name: "Legs A",
        exercises: [
          { name: "Back Squat",                        muscle: "legs",    sets: 5, reps: "6-8",   measurementType: "weight_reps" },
          { name: "Romanian Deadlift",                 muscle: "legs",    sets: 4, reps: "8-10",  measurementType: "weight_reps" },
          { name: "Leg Press",                         muscle: "legs",    sets: 3, reps: "10-12", measurementType: "weight_reps" },
          { name: "Leg Extension",                     muscle: "legs",    sets: 3, reps: "12-15", measurementType: "weight_reps" },
          { name: "Leg Curl",                          muscle: "legs",    sets: 3, reps: "10-12", measurementType: "weight_reps" },
          { name: "Machine Calf Raise (Standing)",     muscle: "legs",    sets: 4, reps: "12-15", measurementType: "weight_reps" },
        ],
      },
      {
        name: "Chest + Back B",
        exercises: [
          { name: "Incline Barbell Bench Press",       muscle: "chest",   sets: 4, reps: "6-8",   measurementType: "weight_reps"    },
          { name: "Flat Dumbbell Bench Press",         muscle: "chest",   sets: 3, reps: "8-10",  measurementType: "weight_reps"    },
          { name: "Dumbbell Pullover",                 muscle: "chest",   sets: 3, reps: "10-12", measurementType: "weight_reps"    },
          { name: "Chin-Up (Back)",                    muscle: "back",    sets: 4, reps: "AMRAP", measurementType: "bodyweight_reps" },
          { name: "T-Bar Row",                         muscle: "back",    sets: 4, reps: "8-10",  measurementType: "weight_reps"    },
          { name: "Wide-Grip Lat Pulldown",            muscle: "back",    sets: 3, reps: "10-12", measurementType: "weight_reps"    },
        ],
      },
      {
        name: "Shoulders + Arms B",
        exercises: [
          { name: "Arnold Press",                      muscle: "shoulders", sets: 4, reps: "8-10",  measurementType: "weight_reps" },
          { name: "Cable Lateral Raise",               muscle: "shoulders", sets: 4, reps: "12-15", measurementType: "weight_reps" },
          { name: "Cable Reverse Fly",                 muscle: "shoulders", sets: 3, reps: "12-15", measurementType: "weight_reps" },
          { name: "EZ Bar Curl",                       muscle: "biceps",    sets: 3, reps: "8-10",  measurementType: "weight_reps" },
          { name: "Incline Dumbbell Curl",             muscle: "biceps",    sets: 3, reps: "10-12", measurementType: "weight_reps" },
          { name: "Overhead Cable Tricep Extension",   muscle: "triceps",   sets: 3, reps: "10-12", measurementType: "weight_reps" },
          { name: "Dumbbell Kickback",                 muscle: "triceps",   sets: 3, reps: "10-12", measurementType: "weight_reps" },
        ],
      },
      {
        name: "Legs B",
        exercises: [
          { name: "Front Squat",                       muscle: "legs",    sets: 4, reps: "8-10",  measurementType: "weight_reps" },
          { name: "Stiff-Leg Deadlift",                muscle: "legs",    sets: 4, reps: "8-10",  measurementType: "weight_reps" },
          { name: "Hack Squat Machine",                muscle: "legs",    sets: 3, reps: "10-12", measurementType: "weight_reps" },
          { name: "Seated Leg Curl",                   muscle: "legs",    sets: 3, reps: "10-12", measurementType: "weight_reps" },
          { name: "Dumbbell Walking Lunge",            muscle: "legs",    sets: 3, reps: "10",    measurementType: "weight_reps" },
          { name: "Machine Calf Raise (Seated)",       muscle: "legs",    sets: 4, reps: "15-20", measurementType: "weight_reps" },
        ],
      },
    ],
    tags: ["split", "6-day", "advanced", "hypertrophy", "classic", "bodybuilding", "high-volume"],
  },

  // ─────────────────────────────────────────────────────────
  // 9. nSuns 5/3/1 LP
  // ─────────────────────────────────────────────────────────
  {
    id: "nsuns-531-lp",
    name: "nSuns 5/3/1 LP",
    description:
      "A high-volume linear progression variant of 5/3/1. Five days of heavy compound lifts with T1/T2 pairings. Rapid strength gains for intermediates willing to put in the work.",
    level: "intermediate",
    daysPerWeek: 5,
    goal: "powerlifting",
    days: [
      {
        name: "Monday — Bench + OHP",
        exercises: [
          { name: "Flat Barbell Bench Press",          muscle: "chest",     sets: 9, reps: "varies", measurementType: "weight_reps" },
          { name: "Overhead Barbell Press",            muscle: "shoulders", sets: 8, reps: "varies", measurementType: "weight_reps" },
          { name: "Wide-Grip Lat Pulldown",            muscle: "back",      sets: 3, reps: "8-10",   measurementType: "weight_reps" },
          { name: "Cable Face Pull",                   muscle: "back",      sets: 3, reps: "15-20",  measurementType: "weight_reps" },
        ],
      },
      {
        name: "Tuesday — Squat + Sumo DL",
        exercises: [
          { name: "Back Squat",                        muscle: "legs",    sets: 9, reps: "varies", measurementType: "weight_reps" },
          { name: "Sumo Deadlift",                     muscle: "legs",    sets: 8, reps: "varies", measurementType: "weight_reps" },
          { name: "Leg Extension",                     muscle: "legs",    sets: 3, reps: "10-12",  measurementType: "weight_reps" },
          { name: "Leg Curl",                          muscle: "legs",    sets: 3, reps: "10-12",  measurementType: "weight_reps" },
        ],
      },
      {
        name: "Wednesday — OHP + Incline",
        exercises: [
          { name: "Overhead Barbell Press",            muscle: "shoulders", sets: 9, reps: "varies", measurementType: "weight_reps" },
          { name: "Incline Barbell Bench Press",       muscle: "chest",     sets: 8, reps: "varies", measurementType: "weight_reps" },
          { name: "Barbell Bent-Over Row",             muscle: "back",      sets: 3, reps: "8-10",   measurementType: "weight_reps" },
          { name: "Dumbbell Lateral Raise",            muscle: "shoulders", sets: 3, reps: "12-15",  measurementType: "weight_reps" },
        ],
      },
      {
        name: "Thursday — Deadlift + Front Squat",
        exercises: [
          { name: "Conventional Deadlift",             muscle: "legs",    sets: 9, reps: "varies", measurementType: "weight_reps" },
          { name: "Front Squat",                       muscle: "legs",    sets: 8, reps: "varies", measurementType: "weight_reps" },
          { name: "Barbell Hip Thrust",                muscle: "legs",    sets: 3, reps: "8-10",   measurementType: "weight_reps" },
          { name: "Hanging Leg Raise",                 muscle: "core",    sets: 3, reps: "10-15",  measurementType: "bodyweight_reps" },
        ],
      },
      {
        name: "Friday — Bench + CG Bench",
        exercises: [
          { name: "Flat Barbell Bench Press",          muscle: "chest",   sets: 9, reps: "varies", measurementType: "weight_reps" },
          { name: "Close-Grip Barbell Bench Press",    muscle: "chest",   sets: 8, reps: "varies", measurementType: "weight_reps" },
          { name: "Seated Cable Row (Close Grip)",     muscle: "back",    sets: 3, reps: "8-10",   measurementType: "weight_reps" },
          { name: "Barbell Curl",                      muscle: "biceps",  sets: 3, reps: "8-10",   measurementType: "weight_reps" },
        ],
      },
    ],
    tags: ["powerlifting", "5-day", "strength", "intermediate", "linear progression", "high-volume"],
  },

  // ─────────────────────────────────────────────────────────
  // 10. PHAT (Power Hypertrophy Adaptive Training)
  // ─────────────────────────────────────────────────────────
  {
    id: "phat",
    name: "PHAT (Power Hypertrophy Adaptive Training)",
    description:
      "Layne Norton's PHAT: two power days followed by three hypertrophy days. Advanced programming that blends powerlifting and bodybuilding for maximum gains.",
    level: "advanced",
    daysPerWeek: 5,
    goal: "hypertrophy",
    days: [
      {
        name: "Upper Power",
        exercises: [
          { name: "Flat Barbell Bench Press",          muscle: "chest",     sets: 3, reps: "3-5",   measurementType: "weight_reps"    },
          { name: "Barbell Bent-Over Row",             muscle: "back",      sets: 3, reps: "3-5",   measurementType: "weight_reps"    },
          { name: "Overhead Barbell Press",            muscle: "shoulders", sets: 3, reps: "5-8",   measurementType: "weight_reps"    },
          { name: "Wide-Grip Lat Pulldown",            muscle: "back",      sets: 2, reps: "6-8",   measurementType: "weight_reps"    },
          { name: "Barbell Curl",                      muscle: "biceps",    sets: 2, reps: "6-8",   measurementType: "weight_reps"    },
          { name: "Tricep Pushdown (Straight Bar)",    muscle: "triceps",   sets: 2, reps: "6-8",   measurementType: "weight_reps"    },
        ],
      },
      {
        name: "Lower Power",
        exercises: [
          { name: "Back Squat",                        muscle: "legs",    sets: 3, reps: "3-5",   measurementType: "weight_reps" },
          { name: "Conventional Deadlift",             muscle: "legs",    sets: 3, reps: "3-5",   measurementType: "weight_reps" },
          { name: "Leg Press",                         muscle: "legs",    sets: 2, reps: "6-8",   measurementType: "weight_reps" },
          { name: "Leg Curl",                          muscle: "legs",    sets: 2, reps: "6-8",   measurementType: "weight_reps" },
          { name: "Machine Calf Raise (Standing)",     muscle: "legs",    sets: 3, reps: "6-8",   measurementType: "weight_reps" },
        ],
      },
      {
        name: "Back + Shoulders Hypertrophy",
        exercises: [
          { name: "T-Bar Row",                         muscle: "back",      sets: 3, reps: "8-12",  measurementType: "weight_reps" },
          { name: "Close-Grip Lat Pulldown",           muscle: "back",      sets: 3, reps: "10-12", measurementType: "weight_reps" },
          { name: "Seated Cable Row (Wide Grip)",      muscle: "back",      sets: 3, reps: "12-15", measurementType: "weight_reps" },
          { name: "Cable Face Pull",                   muscle: "back",      sets: 3, reps: "15-20", measurementType: "weight_reps" },
          { name: "Seated Dumbbell Shoulder Press",    muscle: "shoulders", sets: 3, reps: "8-12",  measurementType: "weight_reps" },
          { name: "Dumbbell Lateral Raise",            muscle: "shoulders", sets: 3, reps: "12-15", measurementType: "weight_reps" },
          { name: "Dumbbell Rear Delt Fly",            muscle: "shoulders", sets: 3, reps: "12-15", measurementType: "weight_reps" },
        ],
      },
      {
        name: "Lower Hypertrophy",
        exercises: [
          { name: "Front Squat",                       muscle: "legs",    sets: 3, reps: "8-12",  measurementType: "weight_reps" },
          { name: "Romanian Deadlift",                 muscle: "legs",    sets: 3, reps: "8-12",  measurementType: "weight_reps" },
          { name: "Leg Extension",                     muscle: "legs",    sets: 3, reps: "12-15", measurementType: "weight_reps" },
          { name: "Seated Leg Curl",                   muscle: "legs",    sets: 3, reps: "12-15", measurementType: "weight_reps" },
          { name: "Barbell Hip Thrust",                muscle: "legs",    sets: 3, reps: "10-12", measurementType: "weight_reps" },
          { name: "Machine Calf Raise (Seated)",       muscle: "legs",    sets: 4, reps: "12-15", measurementType: "weight_reps" },
        ],
      },
      {
        name: "Chest + Arms Hypertrophy",
        exercises: [
          { name: "Incline Dumbbell Bench Press",      muscle: "chest",   sets: 3, reps: "8-12",  measurementType: "weight_reps" },
          { name: "Cable Fly (Low-to-High)",           muscle: "chest",   sets: 3, reps: "12-15", measurementType: "weight_reps" },
          { name: "Pec Deck",                          muscle: "chest",   sets: 3, reps: "12-15", measurementType: "weight_reps" },
          { name: "Incline Dumbbell Curl",             muscle: "biceps",  sets: 3, reps: "10-12", measurementType: "weight_reps" },
          { name: "Concentration Curl",                muscle: "biceps",  sets: 3, reps: "12-15", measurementType: "weight_reps" },
          { name: "Overhead Cable Tricep Extension",   muscle: "triceps", sets: 3, reps: "10-12", measurementType: "weight_reps" },
          { name: "Dumbbell Skull Crusher",            muscle: "triceps", sets: 3, reps: "10-12", measurementType: "weight_reps" },
        ],
      },
    ],
    tags: ["split", "5-day", "advanced", "hypertrophy", "strength", "power", "bodybuilding", "high-volume"],
  },

  // ─────────────────────────────────────────────────────────
  // 11. Minimalist (2-Day)
  // ─────────────────────────────────────────────────────────
  {
    id: "minimalist-2day",
    name: "Minimalist (2-Day)",
    description:
      "The bare-minimum effective program. Just two days per week with the essential compound lifts. Ideal for beginners, busy schedules, or deload periods.",
    level: "beginner",
    daysPerWeek: 2,
    goal: "general",
    days: [
      {
        name: "Day A",
        exercises: [
          { name: "Back Squat",                        muscle: "legs",    sets: 3, reps: "5",     measurementType: "weight_reps" },
          { name: "Flat Barbell Bench Press",          muscle: "chest",   sets: 3, reps: "5",     measurementType: "weight_reps" },
          { name: "Barbell Bent-Over Row",             muscle: "back",    sets: 3, reps: "5",     measurementType: "weight_reps" },
        ],
      },
      {
        name: "Day B",
        exercises: [
          { name: "Conventional Deadlift",             muscle: "legs",      sets: 3, reps: "5",     measurementType: "weight_reps"    },
          { name: "Overhead Barbell Press",            muscle: "shoulders", sets: 3, reps: "5",     measurementType: "weight_reps"    },
          { name: "Chin-Up",                           muscle: "biceps",    sets: 3, reps: "AMRAP", measurementType: "bodyweight_reps" },
        ],
      },
    ],
    tags: ["full-body", "2-day", "beginner", "general", "minimalist", "time-efficient", "compound"],
  },

  // ─────────────────────────────────────────────────────────
  // 12. Bodyweight Only
  // ─────────────────────────────────────────────────────────
  {
    id: "bodyweight-only",
    name: "Bodyweight Only",
    description:
      "No gym needed. Three days of push, pull, and leg training using only bodyweight exercises. Perfect for home workouts, travel, or getting started.",
    level: "beginner",
    daysPerWeek: 3,
    goal: "general",
    days: [
      {
        name: "Push Day",
        exercises: [
          { name: "Push-Up",                           muscle: "bodyweight", sets: 4, reps: "AMRAP", measurementType: "bodyweight_reps" },
          { name: "Dips (Bodyweight)",                 muscle: "bodyweight", sets: 3, reps: "AMRAP", measurementType: "bodyweight_reps" },
          { name: "Pike Push-Up",                      muscle: "bodyweight", sets: 3, reps: "8-12",  measurementType: "bodyweight_reps" },
          { name: "Diamond Push-Up",                   muscle: "bodyweight", sets: 3, reps: "AMRAP", measurementType: "bodyweight_reps" },
          { name: "Decline Push-Up",                   muscle: "bodyweight", sets: 3, reps: "AMRAP", measurementType: "bodyweight_reps" },
        ],
      },
      {
        name: "Pull Day",
        exercises: [
          { name: "Wide-Grip Pull-Up (Bodyweight)",    muscle: "bodyweight", sets: 4, reps: "AMRAP", measurementType: "bodyweight_reps" },
          { name: "Inverted Row (Bodyweight)",         muscle: "bodyweight", sets: 3, reps: "8-12",  measurementType: "bodyweight_reps" },
          { name: "Chin-Up (Bodyweight)",              muscle: "bodyweight", sets: 3, reps: "AMRAP", measurementType: "bodyweight_reps" },
          { name: "Scapular Pull-Up",                  muscle: "bodyweight", sets: 3, reps: "10-15", measurementType: "bodyweight_reps" },
        ],
      },
      {
        name: "Legs Day",
        exercises: [
          { name: "Bodyweight Squat",                  muscle: "bodyweight", sets: 4, reps: "15-20", measurementType: "bodyweight_reps" },
          { name: "Walking Lunge",                     muscle: "bodyweight", sets: 3, reps: "12",    measurementType: "bodyweight_reps" },
          { name: "Glute Bridge",                      muscle: "bodyweight", sets: 3, reps: "15-20", measurementType: "bodyweight_reps" },
          { name: "Bulgarian Split Squat",             muscle: "bodyweight", sets: 3, reps: "10",    measurementType: "bodyweight_reps" },
          { name: "Bodyweight Calf Raise",             muscle: "legs",       sets: 4, reps: "20-25", measurementType: "bodyweight_reps" },
        ],
      },
    ],
    tags: ["bodyweight", "3-day", "beginner", "general", "home", "no-equipment", "travel"],
  },
];

// ── Helper functions ──────────────────────────────────────────

/** Filter programs by skill level */
export function getProgramsByLevel(level: string): ProgramTemplate[] {
  return PROGRAM_TEMPLATES.filter((p) => p.level === level);
}

/** Filter programs by training goal */
export function getProgramsByGoal(goal: string): ProgramTemplate[] {
  return PROGRAM_TEMPLATES.filter((p) => p.goal === goal);
}
