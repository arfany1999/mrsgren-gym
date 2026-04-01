import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { z } from "zod";

export const workoutsRouter = Router();

workoutsRouter.use(requireAuth);

const setSchema = z.object({
  reps: z.number().int().positive().optional(),
  weightKg: z.number().nonnegative().optional(),
  setType: z.enum(["normal", "warmup", "dropset", "failure"]).default("normal"),
  rpe: z.number().min(1).max(10).optional(),
});

// POST /workouts — start a new workout session
workoutsRouter.post("/", async (req: AuthRequest, res) => {
  const { routineId, title } = req.body as { routineId?: string; title?: string };

  const workout = await prisma.workout.create({
    data: {
      userId: req.userId!,
      routineId: routineId ?? null,
      title: title ?? "Workout",
      startedAt: new Date(),
    },
    include: { workoutExercises: { include: { sets: true, exercise: true } } },
  });

  // If started from a routine, pre-populate exercises
  if (routineId) {
    const routineExercises = await prisma.routineExercise.findMany({
      where: { routineId },
      orderBy: { order: "asc" },
    });
    for (const re of routineExercises) {
      await prisma.workoutExercise.create({
        data: { workoutId: workout.id, exerciseId: re.exerciseId, order: re.order },
      });
    }
    const updated = await prisma.workout.findUnique({
      where: { id: workout.id },
      include: { workoutExercises: { include: { sets: true, exercise: true }, orderBy: { order: "asc" } } },
    });
    res.status(201).json(updated);
    return;
  }

  res.status(201).json(workout);
});

// GET /workouts — list user's workouts
workoutsRouter.get("/", async (req: AuthRequest, res) => {
  const { page = "1", limit = "20" } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [workouts, total] = await Promise.all([
    prisma.workout.findMany({
      where: { userId: req.userId! },
      skip,
      take: parseInt(limit),
      orderBy: { startedAt: "desc" },
      include: {
        workoutExercises: {
          include: { exercise: { select: { id: true, name: true, muscleGroups: true } }, sets: true },
          orderBy: { order: "asc" },
        },
      },
    }),
    prisma.workout.count({ where: { userId: req.userId! } }),
  ]);

  res.json({ workouts, total, page: parseInt(page), limit: parseInt(limit) });
});

// GET /workouts/:id
workoutsRouter.get("/:id", async (req: AuthRequest, res) => {
  const workout = await prisma.workout.findUnique({
    where: { id: req.params.id },
    include: {
      workoutExercises: {
        include: { exercise: true, sets: { orderBy: { createdAt: "asc" } } },
        orderBy: { order: "asc" },
      },
    },
  });
  if (!workout || workout.userId !== req.userId) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(workout);
});

// PATCH /workouts/:id — update title, notes, finish workout, toggle public
workoutsRouter.patch("/:id", async (req: AuthRequest, res) => {
  const workout = await prisma.workout.findUnique({ where: { id: req.params.id } });
  if (!workout || workout.userId !== req.userId) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const { title, notes, finish, isPublic } = req.body as {
    title?: string;
    notes?: string;
    finish?: boolean;
    isPublic?: boolean;
  };
  const updated = await prisma.workout.update({
    where: { id: req.params.id },
    data: {
      ...(title !== undefined && { title }),
      ...(notes !== undefined && { notes }),
      ...(isPublic !== undefined && { isPublic }),
      ...(finish && { finishedAt: new Date() }),
    },
    include: {
      workoutExercises: {
        include: { exercise: true, sets: true },
        orderBy: { order: "asc" },
      },
    },
  });
  res.json(updated);
});

// DELETE /workouts/:id
workoutsRouter.delete("/:id", async (req: AuthRequest, res) => {
  const workout = await prisma.workout.findUnique({ where: { id: req.params.id } });
  if (!workout || workout.userId !== req.userId) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await prisma.workout.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// POST /workouts/:id/exercises — add exercise to active workout
workoutsRouter.post("/:id/exercises", async (req: AuthRequest, res) => {
  const workout = await prisma.workout.findUnique({ where: { id: req.params.id } });
  if (!workout || workout.userId !== req.userId) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const workoutId = req.params.id;
  if (!workoutId) {
    res.status(400).json({ error: "Missing workout id" });
    return;
  }
  const { exerciseId, supersetId } = req.body as { exerciseId: string; supersetId?: string };
  const count = await prisma.workoutExercise.count({ where: { workoutId } });

  const we = await prisma.workoutExercise.create({
    data: { workoutId, exerciseId, order: count, supersetId: supersetId ?? null },
    include: { exercise: true, sets: true },
  });
  res.status(201).json(we);
});

// DELETE /workouts/:id/exercises/:weId — remove exercise from workout
workoutsRouter.delete("/:id/exercises/:weId", async (req: AuthRequest, res) => {
  const workout = await prisma.workout.findUnique({ where: { id: req.params.id } });
  if (!workout || workout.userId !== req.userId) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await prisma.workoutExercise.delete({ where: { id: req.params.weId } });
  res.json({ ok: true });
});

// POST /workouts/:id/exercises/:weId/sets — log a set
workoutsRouter.post("/:id/exercises/:weId/sets", async (req: AuthRequest, res) => {
  const workout = await prisma.workout.findUnique({ where: { id: req.params.id } });
  if (!workout || workout.userId !== req.userId) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const parsed = setSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const weId = req.params.weId;
  if (!weId) {
    res.status(400).json({ error: "Missing exercise id" });
    return;
  }
  const set = await prisma.set.create({
    data: { workoutExerciseId: weId, ...parsed.data },
  });

  // Check for PR
  const we = await prisma.workoutExercise.findUnique({ where: { id: weId } });
  if (we && parsed.data.weightKg && parsed.data.reps) {
    const e1rm = parsed.data.weightKg * (1 + parsed.data.reps / 30);
    const existingPr = await prisma.personalRecord.findFirst({
      where: { userId: req.userId!, exerciseId: we.exerciseId },
      orderBy: { oneRepMax: "desc" },
    });
    if (!existingPr || e1rm > existingPr.oneRepMax) {
      await prisma.personalRecord.create({
        data: {
          userId: req.userId!,
          exerciseId: we.exerciseId,
          weightKg: parsed.data.weightKg,
          reps: parsed.data.reps,
          oneRepMax: e1rm,
        },
      });
      res.status(201).json({ set, isPr: true });
      return;
    }
  }

  res.status(201).json({ set, isPr: false });
});

// PATCH /sets/:setId — edit a set
workoutsRouter.patch("/sets/:setId", async (req: AuthRequest, res) => {
  const parsed = setSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const set = await prisma.set.update({ where: { id: req.params.setId }, data: parsed.data });
  res.json(set);
});

// DELETE /sets/:setId
workoutsRouter.delete("/sets/:setId", async (req: AuthRequest, res) => {
  await prisma.set.delete({ where: { id: req.params.setId } });
  res.json({ ok: true });
});
