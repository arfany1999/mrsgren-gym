/**
 * Seed the database with exercises from ExerciseDB API
 * https://exercisedb.dev/api/v1
 *
 * Run: pnpm --filter api db:seed
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BASE_URL = "https://exercisedb.dev/api/v1";
const LIMIT = 100;

interface ExerciseDBItem {
  exerciseId: string;
  name: string;
  gifUrl: string;
  targetMuscles: string[];
  bodyParts: string[];
  equipments: string[];
  secondaryMuscles: string[];
  instructions: string[];
}

interface ExerciseDBResponse {
  success: boolean;
  metadata: {
    totalExercises: number;
    totalPages: number;
    currentPage: number;
    nextPage: string | null;
  };
  data: ExerciseDBItem[];
}

async function fetchPage(offset: number): Promise<ExerciseDBResponse> {
  const url = `${BASE_URL}/exercises?limit=${LIMIT}&offset=${offset}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`ExerciseDB request failed: ${res.status} ${url}`);
  return res.json() as Promise<ExerciseDBResponse>;
}

function mapExercise(item: ExerciseDBItem) {
  // Combine primary target muscles + secondary muscles, deduplicate
  const muscleGroups = Array.from(
    new Set([...item.targetMuscles, ...item.secondaryMuscles])
  ).filter(Boolean);

  // Join step-by-step instructions into a single string
  const instructions = item.instructions.join("\n") || undefined;

  // Take first equipment entry (schema stores a single string)
  const equipment = item.equipments[0] ?? undefined;

  return {
    // Use ExerciseDB's stable ID so re-seeding stays idempotent
    id: `edb_${item.exerciseId}`,
    name: item.name
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
    muscleGroups,
    equipment,
    instructions,
    videoUrl: item.gifUrl || undefined,
    isCustom: false,
    createdByUserId: null,
  };
}

async function main() {
  console.log("🌱 Fetching exercises from ExerciseDB...");

  // First request to find total pages
  const first = await fetchPage(0);
  const { totalExercises, totalPages } = first.metadata;
  console.log(`   Found ${totalExercises} exercises across ${totalPages} pages`);

  const allItems: ExerciseDBItem[] = [...first.data];

  // Fetch remaining pages
  for (let page = 1; page < totalPages; page++) {
    process.stdout.write(`   Fetching page ${page + 1}/${totalPages}...\r`);
    const { data } = await fetchPage(page * LIMIT);
    allItems.push(...data);
    // Tiny delay to be polite to the API
    await new Promise((r) => setTimeout(r, 120));
  }

  console.log(`\n   Fetched ${allItems.length} exercises total`);

  // Upsert in batches of 200
  const BATCH = 200;
  let upserted = 0;

  for (let i = 0; i < allItems.length; i += BATCH) {
    const batch = allItems.slice(i, i + BATCH).map(mapExercise);

    await prisma.$transaction(
      batch.map((ex) =>
        prisma.exercise.upsert({
          where: { id: ex.id },
          update: {
            name: ex.name,
            muscleGroups: ex.muscleGroups,
            equipment: ex.equipment,
            instructions: ex.instructions,
            videoUrl: ex.videoUrl,
          },
          create: ex,
        })
      )
    );

    upserted += batch.length;
    console.log(`   Upserted ${upserted}/${allItems.length} exercises`);
  }

  console.log(`\n✅ Done! ${upserted} exercises seeded.`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
