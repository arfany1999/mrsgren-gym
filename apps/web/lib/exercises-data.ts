// ── Curated exercise database ─────────────────────────────────
// Single source of truth for exercises shown in the routine builder.

export type MeasurementType =
  | "weight_reps"      // Sets × Reps × Weight kg  (most strength work)
  | "bodyweight_reps"  // Sets × Reps  (no weight)
  | "timed"            // Sets × Duration in seconds  (planks, holds)
  | "cardio"           // Duration (min) + Distance (km)
  | "reps_only";       // Sets × Reps  (explosive / circuit)

export type EquipmentType =
  | "barbell"
  | "dumbbell"
  | "cable"
  | "machine"
  | "bodyweight"
  | "push"        // bodyweight muscle group sub-section
  | "pull"        // bodyweight muscle group sub-section
  | "legs"        // bodyweight muscle group sub-section
  | "explosive"   // bodyweight muscle group sub-section
  | "holds"       // timed core / bodyweight holds
  | "other";

export interface ExerciseDef {
  name: string;
  muscle: string;        // matches muscle_group in DB
  type: MeasurementType;
  equipment: EquipmentType;
}

// ── Muscle group chips shown in the picker ────────────────────
export const MUSCLE_GROUPS: { id: string; label: string; emoji: string }[] = [
  { id: "chest",      label: "Chest",      emoji: "🫀" },
  { id: "back",       label: "Back",       emoji: "🔙" },
  { id: "shoulders",  label: "Shoulders",  emoji: "🏋️" },
  { id: "triceps",    label: "Triceps",    emoji: "🦾" },
  { id: "biceps",     label: "Biceps",     emoji: "💪" },
  { id: "forearms",   label: "Forearms",   emoji: "🖐️" },
  { id: "legs",       label: "Legs",       emoji: "🦵" },
  { id: "core",       label: "Core",       emoji: "🎯" },
  { id: "bodyweight", label: "Bodyweight", emoji: "🤸" },
  { id: "cardio",     label: "Cardio",     emoji: "🏃" },
];

// Label shown as a section header in the exercise picker
export const EQUIPMENT_LABELS: Record<EquipmentType, string> = {
  barbell:    "Barbell",
  dumbbell:   "Dumbbell",
  cable:      "Cable",
  machine:    "Machine",
  bodyweight: "Bodyweight",
  push:       "Push",
  pull:       "Pull",
  legs:       "Legs",
  explosive:  "Explosive",
  holds:      "Holds",
  other:      "Other",
};

// ── Full exercise list ────────────────────────────────────────
export const EXERCISES: ExerciseDef[] = [

  // ╔══════════════════════════════════════════════════╗
  // ║  CHEST                                           ║
  // ╚══════════════════════════════════════════════════╝
  // — Barbell ——————————————————————————————————————————
  { name: "Flat Barbell Bench Press",           muscle: "chest",    type: "weight_reps",    equipment: "barbell"    },
  { name: "Incline Barbell Bench Press",        muscle: "chest",    type: "weight_reps",    equipment: "barbell"    },
  { name: "Decline Barbell Bench Press",        muscle: "chest",    type: "weight_reps",    equipment: "barbell"    },
  { name: "Close-Grip Barbell Bench Press",     muscle: "chest",    type: "weight_reps",    equipment: "barbell"    },
  { name: "Barbell Pullover",                   muscle: "chest",    type: "weight_reps",    equipment: "barbell"    },
  // — Dumbbell —————————————————————————————————————————
  { name: "Flat Dumbbell Bench Press",          muscle: "chest",    type: "weight_reps",    equipment: "dumbbell"   },
  { name: "Incline Dumbbell Bench Press",       muscle: "chest",    type: "weight_reps",    equipment: "dumbbell"   },
  { name: "Decline Dumbbell Bench Press",       muscle: "chest",    type: "weight_reps",    equipment: "dumbbell"   },
  { name: "Close-Grip Dumbbell Press",          muscle: "chest",    type: "weight_reps",    equipment: "dumbbell"   },
  { name: "Dumbbell Pullover",                  muscle: "chest",    type: "weight_reps",    equipment: "dumbbell"   },
  // — Bodyweight ————————————————————————————————————————
  { name: "Dips",                               muscle: "chest",    type: "bodyweight_reps", equipment: "bodyweight" },

  // ╔══════════════════════════════════════════════════╗
  // ║  BACK                                            ║
  // ╚══════════════════════════════════════════════════╝
  // — Cable ————————————————————————————————————————————
  { name: "Wide-Grip Lat Pulldown",             muscle: "back",     type: "weight_reps",    equipment: "cable"      },
  { name: "Close-Grip Lat Pulldown",            muscle: "back",     type: "weight_reps",    equipment: "cable"      },
  { name: "Reverse-Grip Lat Pulldown",          muscle: "back",     type: "weight_reps",    equipment: "cable"      },
  { name: "Single-Arm Lat Pulldown",            muscle: "back",     type: "weight_reps",    equipment: "cable"      },
  { name: "Straight-Arm Pulldown",              muscle: "back",     type: "weight_reps",    equipment: "cable"      },
  { name: "Seated Cable Row (Wide Grip)",       muscle: "back",     type: "weight_reps",    equipment: "cable"      },
  { name: "Seated Cable Row (Close Grip)",      muscle: "back",     type: "weight_reps",    equipment: "cable"      },
  { name: "Single-Arm Cable Row",               muscle: "back",     type: "weight_reps",    equipment: "cable"      },
  { name: "Cable Face Pull",                    muscle: "back",     type: "weight_reps",    equipment: "cable"      },
  { name: "High Cable Row",                     muscle: "back",     type: "weight_reps",    equipment: "cable"      },
  // — Bodyweight ————————————————————————————————————————
  { name: "Pull-Up",                            muscle: "back",     type: "bodyweight_reps", equipment: "bodyweight" },

  // ╔══════════════════════════════════════════════════╗
  // ║  SHOULDERS                                       ║
  // ╚══════════════════════════════════════════════════╝
  // — Barbell ——————————————————————————————————————————
  { name: "Overhead Barbell Press",             muscle: "shoulders", type: "weight_reps",    equipment: "barbell"    },
  { name: "Seated Barbell Shoulder Press",      muscle: "shoulders", type: "weight_reps",    equipment: "barbell"    },
  { name: "Barbell Push Press",                 muscle: "shoulders", type: "weight_reps",    equipment: "barbell"    },
  { name: "Behind-the-Neck Press",              muscle: "shoulders", type: "weight_reps",    equipment: "barbell"    },
  { name: "Barbell Upright Row",                muscle: "shoulders", type: "weight_reps",    equipment: "barbell"    },
  { name: "Landmine Press",                     muscle: "shoulders", type: "weight_reps",    equipment: "barbell"    },
  // — Dumbbell —————————————————————————————————————————
  { name: "Seated Dumbbell Shoulder Press",     muscle: "shoulders", type: "weight_reps",    equipment: "dumbbell"   },
  { name: "Standing Dumbbell Shoulder Press",   muscle: "shoulders", type: "weight_reps",    equipment: "dumbbell"   },
  { name: "Arnold Press",                       muscle: "shoulders", type: "weight_reps",    equipment: "dumbbell"   },
  { name: "Dumbbell Lateral Raise",             muscle: "shoulders", type: "weight_reps",    equipment: "dumbbell"   },
  { name: "Dumbbell Front Raise",               muscle: "shoulders", type: "weight_reps",    equipment: "dumbbell"   },
  { name: "Dumbbell Rear Delt Fly",             muscle: "shoulders", type: "weight_reps",    equipment: "dumbbell"   },
  { name: "Dumbbell Upright Row",               muscle: "shoulders", type: "weight_reps",    equipment: "dumbbell"   },
  { name: "Dumbbell Shrug",                     muscle: "shoulders", type: "weight_reps",    equipment: "dumbbell"   },
  // — Cable ————————————————————————————————————————————
  { name: "Cable Lateral Raise",                muscle: "shoulders", type: "weight_reps",    equipment: "cable"      },
  { name: "Cable Front Raise",                  muscle: "shoulders", type: "weight_reps",    equipment: "cable"      },
  { name: "Cable Reverse Fly",                  muscle: "shoulders", type: "weight_reps",    equipment: "cable"      },
  { name: "Cable Face Pull (Shoulders)",        muscle: "shoulders", type: "weight_reps",    equipment: "cable"      },
  { name: "Cable Upright Row",                  muscle: "shoulders", type: "weight_reps",    equipment: "cable"      },
  // — Machine ——————————————————————————————————————————
  { name: "Machine Shoulder Press",             muscle: "shoulders", type: "weight_reps",    equipment: "machine"    },
  { name: "Machine Lateral Raise",              muscle: "shoulders", type: "weight_reps",    equipment: "machine"    },
  { name: "Reverse Pec Deck (Rear Delts)",      muscle: "shoulders", type: "weight_reps",    equipment: "machine"    },
  { name: "Smith Machine Shoulder Press",       muscle: "shoulders", type: "weight_reps",    equipment: "machine"    },
  // — Bodyweight ————————————————————————————————————————
  { name: "Pike Push-Up",                       muscle: "shoulders", type: "bodyweight_reps", equipment: "bodyweight" },
  { name: "Handstand Push-Up",                  muscle: "shoulders", type: "bodyweight_reps", equipment: "bodyweight" },
  { name: "Wall Walk",                          muscle: "shoulders", type: "bodyweight_reps", equipment: "bodyweight" },

  // ╔══════════════════════════════════════════════════╗
  // ║  TRICEPS                                         ║
  // ╚══════════════════════════════════════════════════╝
  // — Barbell ——————————————————————————————————————————
  { name: "Close-Grip Bench Press",             muscle: "triceps",  type: "weight_reps",    equipment: "barbell"    },
  { name: "Barbell Skull Crusher",              muscle: "triceps",  type: "weight_reps",    equipment: "barbell"    },
  { name: "Barbell Overhead Tricep Extension",  muscle: "triceps",  type: "weight_reps",    equipment: "barbell"    },
  // — Cable ————————————————————————————————————————————
  { name: "Tricep Pushdown (Straight Bar)",     muscle: "triceps",  type: "weight_reps",    equipment: "cable"      },
  { name: "Tricep Pushdown (Rope)",             muscle: "triceps",  type: "weight_reps",    equipment: "cable"      },
  { name: "Reverse-Grip Pushdown",              muscle: "triceps",  type: "weight_reps",    equipment: "cable"      },
  { name: "Overhead Cable Tricep Extension",    muscle: "triceps",  type: "weight_reps",    equipment: "cable"      },
  { name: "Single-Arm Cable Pushdown",          muscle: "triceps",  type: "weight_reps",    equipment: "cable"      },
  // — Dumbbell —————————————————————————————————————————
  { name: "Dumbbell Skull Crusher",             muscle: "triceps",  type: "weight_reps",    equipment: "dumbbell"   },
  { name: "Overhead Dumbbell Tricep Extension", muscle: "triceps",  type: "weight_reps",    equipment: "dumbbell"   },
  { name: "Dumbbell Kickback",                  muscle: "triceps",  type: "weight_reps",    equipment: "dumbbell"   },
  { name: "Single-Arm Overhead Extension",      muscle: "triceps",  type: "weight_reps",    equipment: "dumbbell"   },

  // ╔══════════════════════════════════════════════════╗
  // ║  BICEPS                                          ║
  // ╚══════════════════════════════════════════════════╝
  // — Barbell ——————————————————————————————————————————
  { name: "Barbell Curl",                       muscle: "biceps",   type: "weight_reps",    equipment: "barbell"    },
  { name: "EZ Bar Curl",                        muscle: "biceps",   type: "weight_reps",    equipment: "barbell"    },
  { name: "Reverse-Grip Barbell Curl",          muscle: "biceps",   type: "weight_reps",    equipment: "barbell"    },
  { name: "Drag Curl",                          muscle: "biceps",   type: "weight_reps",    equipment: "barbell"    },
  // — Dumbbell —————————————————————————————————————————
  { name: "Dumbbell Bicep Curl",                muscle: "biceps",   type: "weight_reps",    equipment: "dumbbell"   },
  { name: "Hammer Curl",                        muscle: "biceps",   type: "weight_reps",    equipment: "dumbbell"   },
  { name: "Incline Dumbbell Curl",              muscle: "biceps",   type: "weight_reps",    equipment: "dumbbell"   },
  { name: "Concentration Curl",                 muscle: "biceps",   type: "weight_reps",    equipment: "dumbbell"   },
  { name: "Zottman Curl",                       muscle: "biceps",   type: "weight_reps",    equipment: "dumbbell"   },
  // — Cable ————————————————————————————————————————————
  { name: "Cable Curl (Straight Bar)",          muscle: "biceps",   type: "weight_reps",    equipment: "cable"      },
  { name: "Cable Curl (Rope)",                  muscle: "biceps",   type: "weight_reps",    equipment: "cable"      },
  { name: "Reverse-Grip Cable Curl",            muscle: "biceps",   type: "weight_reps",    equipment: "cable"      },
  { name: "Single-Arm Cable Curl",              muscle: "biceps",   type: "weight_reps",    equipment: "cable"      },
  { name: "High Cable Curl",                    muscle: "biceps",   type: "weight_reps",    equipment: "cable"      },
  // — Bodyweight ————————————————————————————————————————
  { name: "Chin-Up",                            muscle: "biceps",   type: "bodyweight_reps", equipment: "bodyweight" },
  { name: "Inverted Row",                       muscle: "biceps",   type: "bodyweight_reps", equipment: "bodyweight" },

  // ╔══════════════════════════════════════════════════╗
  // ║  FOREARMS                                        ║
  // ╚══════════════════════════════════════════════════╝
  // — Barbell ——————————————————————————————————————————
  { name: "Wrist Curl",                         muscle: "forearms", type: "weight_reps",    equipment: "barbell"    },
  { name: "Reverse Wrist Curl",                 muscle: "forearms", type: "weight_reps",    equipment: "barbell"    },
  { name: "Behind-the-Back Barbell Wrist Curl", muscle: "forearms", type: "weight_reps",    equipment: "barbell"    },
  // — Dumbbell —————————————————————————————————————————
  { name: "Single-Arm Dumbbell Wrist Curl",     muscle: "forearms", type: "weight_reps",    equipment: "dumbbell"   },
  { name: "Farmer's Carry",                     muscle: "forearms", type: "weight_reps",    equipment: "dumbbell"   },
  // — Cable ————————————————————————————————————————————
  { name: "Cable Wrist Curl",                   muscle: "forearms", type: "weight_reps",    equipment: "cable"      },
  // — Bodyweight / Other ————————————————————————————————
  { name: "Dead Hang",                          muscle: "forearms", type: "timed",          equipment: "bodyweight" },
  { name: "Towel Pull-Up",                      muscle: "forearms", type: "bodyweight_reps", equipment: "bodyweight" },
  { name: "Plate Pinch",                        muscle: "forearms", type: "timed",          equipment: "other"      },
  { name: "Hand Gripper",                       muscle: "forearms", type: "reps_only",      equipment: "other"      },
  { name: "Rice Bucket",                        muscle: "forearms", type: "timed",          equipment: "other"      },

  // ╔══════════════════════════════════════════════════╗
  // ║  LEGS                                            ║
  // ╚══════════════════════════════════════════════════╝
  // — Barbell ——————————————————————————————————————————
  { name: "Back Squat",                         muscle: "legs",     type: "weight_reps",    equipment: "barbell"    },
  { name: "Front Squat",                        muscle: "legs",     type: "weight_reps",    equipment: "barbell"    },
  { name: "Romanian Deadlift",                  muscle: "legs",     type: "weight_reps",    equipment: "barbell"    },
  { name: "Conventional Deadlift",              muscle: "legs",     type: "weight_reps",    equipment: "barbell"    },
  { name: "Sumo Deadlift",                      muscle: "legs",     type: "weight_reps",    equipment: "barbell"    },
  { name: "Good Morning",                       muscle: "legs",     type: "weight_reps",    equipment: "barbell"    },
  // — Dumbbell —————————————————————————————————————————
  { name: "Dumbbell Squat",                     muscle: "legs",     type: "weight_reps",    equipment: "dumbbell"   },
  { name: "Dumbbell Romanian Deadlift",         muscle: "legs",     type: "weight_reps",    equipment: "dumbbell"   },
  { name: "Dumbbell Lunge",                     muscle: "legs",     type: "weight_reps",    equipment: "dumbbell"   },
  { name: "Dumbbell Step-Up",                   muscle: "legs",     type: "weight_reps",    equipment: "dumbbell"   },
  { name: "Dumbbell Sumo Squat",                muscle: "legs",     type: "weight_reps",    equipment: "dumbbell"   },
  { name: "Dumbbell Bulgarian Split Squat",     muscle: "legs",     type: "weight_reps",    equipment: "dumbbell"   },
  // — Machine ——————————————————————————————————————————
  { name: "Leg Press",                          muscle: "legs",     type: "weight_reps",    equipment: "machine"    },
  { name: "Leg Extension",                      muscle: "legs",     type: "weight_reps",    equipment: "machine"    },
  { name: "Leg Curl",                           muscle: "legs",     type: "weight_reps",    equipment: "machine"    },
  { name: "Seated Leg Curl",                    muscle: "legs",     type: "weight_reps",    equipment: "machine"    },
  { name: "Hip Abduction Machine",              muscle: "legs",     type: "weight_reps",    equipment: "machine"    },
  { name: "Hip Adduction Machine",              muscle: "legs",     type: "weight_reps",    equipment: "machine"    },
  { name: "Smith Machine Squat",                muscle: "legs",     type: "weight_reps",    equipment: "machine"    },
  { name: "Hack Squat Machine",                 muscle: "legs",     type: "weight_reps",    equipment: "machine"    },

  // ╔══════════════════════════════════════════════════╗
  // ║  CORE                                            ║
  // ╚══════════════════════════════════════════════════╝
  // — Cable ————————————————————————————————————————————
  { name: "Cable Crunch",                       muscle: "core",     type: "weight_reps",    equipment: "cable"      },
  { name: "Pallof Press",                       muscle: "core",     type: "weight_reps",    equipment: "cable"      },
  { name: "Cable Woodchop",                     muscle: "core",     type: "weight_reps",    equipment: "cable"      },
  { name: "High-to-Low Cable Chop",             muscle: "core",     type: "weight_reps",    equipment: "cable"      },
  // — Barbell / Dumbbell ————————————————————————————————
  { name: "Landmine Rotation",                  muscle: "core",     type: "weight_reps",    equipment: "barbell"    },
  { name: "Decline Weighted Crunch",            muscle: "core",     type: "weight_reps",    equipment: "barbell"    },
  { name: "Weighted Sit-Up",                    muscle: "core",     type: "weight_reps",    equipment: "barbell"    },
  { name: "Dumbbell Side Bend",                 muscle: "core",     type: "weight_reps",    equipment: "dumbbell"   },
  // — Bodyweight ————————————————————————————————————————
  { name: "Ab Wheel Rollout",                   muscle: "core",     type: "reps_only",      equipment: "bodyweight" },
  { name: "Crunch",                             muscle: "core",     type: "bodyweight_reps", equipment: "bodyweight" },
  { name: "Sit-Up",                             muscle: "core",     type: "bodyweight_reps", equipment: "bodyweight" },
  { name: "Reverse Crunch",                     muscle: "core",     type: "bodyweight_reps", equipment: "bodyweight" },
  { name: "Leg Raise",                          muscle: "core",     type: "bodyweight_reps", equipment: "bodyweight" },
  { name: "Hanging Knee Raise",                 muscle: "core",     type: "bodyweight_reps", equipment: "bodyweight" },
  { name: "Bicycle Crunch",                     muscle: "core",     type: "bodyweight_reps", equipment: "bodyweight" },
  { name: "V-Up",                               muscle: "core",     type: "bodyweight_reps", equipment: "bodyweight" },
  { name: "Hanging Leg Raise",                  muscle: "core",     type: "bodyweight_reps", equipment: "bodyweight" },
  { name: "Dragon Flag",                        muscle: "core",     type: "bodyweight_reps", equipment: "bodyweight" },
  { name: "Lying Leg Raise",                    muscle: "core",     type: "bodyweight_reps", equipment: "bodyweight" },
  { name: "Russian Twist",                      muscle: "core",     type: "bodyweight_reps", equipment: "bodyweight" },
  { name: "Bird Dog",                           muscle: "core",     type: "bodyweight_reps", equipment: "bodyweight" },
  // — Holds ————————————————————————————————————————————
  { name: "Plank",                              muscle: "core",     type: "timed",          equipment: "holds"      },
  { name: "Side Plank",                         muscle: "core",     type: "timed",          equipment: "holds"      },
  { name: "Hollow Body Hold",                   muscle: "core",     type: "timed",          equipment: "holds"      },
  { name: "Dead Bug",                           muscle: "core",     type: "timed",          equipment: "holds"      },
  { name: "RKC Plank",                          muscle: "core",     type: "timed",          equipment: "holds"      },
  { name: "Side Plank with Rotation",           muscle: "core",     type: "timed",          equipment: "holds"      },
  { name: "Copenhagen Plank",                   muscle: "core",     type: "timed",          equipment: "holds"      },

  // ╔══════════════════════════════════════════════════╗
  // ║  BODYWEIGHT                                      ║
  // ╚══════════════════════════════════════════════════╝
  // — Push ——————————————————————————————————————————————
  { name: "Push-Up",                            muscle: "bodyweight", type: "bodyweight_reps", equipment: "push"   },
  { name: "Wide-Grip Push-Up",                  muscle: "bodyweight", type: "bodyweight_reps", equipment: "push"   },
  { name: "Diamond Push-Up",                    muscle: "bodyweight", type: "bodyweight_reps", equipment: "push"   },
  { name: "Pike Push-Up",                       muscle: "bodyweight", type: "bodyweight_reps", equipment: "push"   },
  { name: "Handstand Push-Up",                  muscle: "bodyweight", type: "bodyweight_reps", equipment: "push"   },
  { name: "Decline Push-Up",                    muscle: "bodyweight", type: "bodyweight_reps", equipment: "push"   },
  { name: "Archer Push-Up",                     muscle: "bodyweight", type: "bodyweight_reps", equipment: "push"   },
  { name: "Close-Grip Push-Up",                 muscle: "bodyweight", type: "bodyweight_reps", equipment: "push"   },
  // — Pull ——————————————————————————————————————————————
  { name: "Neutral-Grip Pull-Up",               muscle: "bodyweight", type: "bodyweight_reps", equipment: "pull"   },
  { name: "Scapular Pull-Up",                   muscle: "bodyweight", type: "bodyweight_reps", equipment: "pull"   },
  { name: "Face Pull (Band)",                   muscle: "bodyweight", type: "bodyweight_reps", equipment: "pull"   },
  { name: "Inverted Row (Bodyweight)",          muscle: "bodyweight", type: "bodyweight_reps", equipment: "pull"   },
  // — Legs ——————————————————————————————————————————————
  { name: "Bodyweight Squat",                   muscle: "bodyweight", type: "bodyweight_reps", equipment: "legs"   },
  { name: "Bulgarian Split Squat",              muscle: "bodyweight", type: "bodyweight_reps", equipment: "legs"   },
  { name: "Reverse Lunge",                      muscle: "bodyweight", type: "bodyweight_reps", equipment: "legs"   },
  { name: "Walking Lunge",                      muscle: "bodyweight", type: "bodyweight_reps", equipment: "legs"   },
  { name: "Pistol Squat",                       muscle: "bodyweight", type: "bodyweight_reps", equipment: "legs"   },
  { name: "Glute Bridge",                       muscle: "bodyweight", type: "bodyweight_reps", equipment: "legs"   },
  { name: "Hip Thrust (Single Leg)",            muscle: "bodyweight", type: "bodyweight_reps", equipment: "legs"   },
  { name: "Nordic Hamstring Curl",              muscle: "bodyweight", type: "bodyweight_reps", equipment: "legs"   },
  { name: "Wall Sit",                           muscle: "bodyweight", type: "timed",          equipment: "legs"    },
  // — Explosive ——————————————————————————————————————————
  { name: "Jump Squat",                         muscle: "bodyweight", type: "reps_only",      equipment: "explosive" },
  { name: "Burpee",                             muscle: "bodyweight", type: "reps_only",      equipment: "explosive" },
  { name: "Mountain Climber",                   muscle: "bodyweight", type: "reps_only",      equipment: "explosive" },
  { name: "Jumping Jack",                       muscle: "bodyweight", type: "reps_only",      equipment: "explosive" },
  { name: "Box Jump",                           muscle: "bodyweight", type: "reps_only",      equipment: "explosive" },
  { name: "Broad Jump",                         muscle: "bodyweight", type: "reps_only",      equipment: "explosive" },
  { name: "Handstand Hold",                     muscle: "bodyweight", type: "timed",          equipment: "explosive" },
  { name: "Bear Crawl",                         muscle: "bodyweight", type: "timed",          equipment: "explosive" },

  // ╔══════════════════════════════════════════════════╗
  // ║  CARDIO                                          ║
  // ╚══════════════════════════════════════════════════╝
  { name: "Treadmill",                          muscle: "cardio",   type: "cardio",         equipment: "machine"    },
  { name: "Incline Treadmill Walk",             muscle: "cardio",   type: "cardio",         equipment: "machine"    },
  { name: "Stationary Bike",                    muscle: "cardio",   type: "cardio",         equipment: "machine"    },
  { name: "Rowing Machine",                     muscle: "cardio",   type: "cardio",         equipment: "machine"    },
  { name: "Elliptical",                         muscle: "cardio",   type: "cardio",         equipment: "machine"    },
  { name: "Stair Climber",                      muscle: "cardio",   type: "cardio",         equipment: "machine"    },
  { name: "Ski Erg",                            muscle: "cardio",   type: "cardio",         equipment: "machine"    },
];

/** Look up measurement type for an exercise name (fallback = weight_reps) */
export function getMeasurementType(name: string): MeasurementType {
  return EXERCISES.find(e => e.name.toLowerCase() === name.toLowerCase())?.type ?? "weight_reps";
}

const VALID_MEASUREMENT_TYPES: ReadonlySet<MeasurementType> = new Set([
  "weight_reps",
  "bodyweight_reps",
  "timed",
  "cardio",
  "reps_only",
]);

/**
 * Resolve the measurement type for an exercise, given a raw value possibly
 * pulled from the DB and the exercise name. Returns the raw value only if it
 * is a known MeasurementType; otherwise falls back to a name-based lookup
 * (and finally to `weight_reps`).
 *
 * This is the single source of truth used everywhere we materialise an
 * exercise into the active workout / routine editor, so historical rows that
 * stored `null`, `""`, or a typo (e.g. "weight_rep") still render the right
 * inputs (KG + REPS) instead of an empty SetRow with no fields.
 */
export function resolveMeasurementType(raw: unknown, name: string): MeasurementType {
  if (typeof raw === "string" && VALID_MEASUREMENT_TYPES.has(raw as MeasurementType)) {
    return raw as MeasurementType;
  }
  return getMeasurementType(name);
}

/**
 * Returns exercises for a muscle group, grouped by equipment.
 * Each entry: { equipment, label, exercises[] }
 */
export function getGroupedExercises(muscle: string): { equipment: EquipmentType; label: string; exercises: ExerciseDef[] }[] {
  const filtered = EXERCISES.filter(e => e.muscle === muscle);

  // Preserve the natural order equipment types appear in the list
  const seen: EquipmentType[] = [];
  for (const ex of filtered) {
    if (!seen.includes(ex.equipment)) seen.push(ex.equipment);
  }

  return seen.map(eq => ({
    equipment: eq,
    label: EQUIPMENT_LABELS[eq],
    exercises: filtered.filter(e => e.equipment === eq),
  }));
}
