import { Prisma } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { z } from "zod";

export const routinesRouter = Router();

routinesRouter.use(requireAuth);

const routineSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().optional(),
  folderId: z.string().optional(),
  isPublic: z.boolean().default(false),
});

const exerciseConfigSchema = z.object({
  exerciseId: z.string(),
  order: z.number().int().nonnegative(),
  setsConfig: z.array(
    z.object({
      setType: z.enum(["normal", "warmup", "dropset", "failure"]).default("normal"),
      reps: z.number().int().positive().optional(),
      weightKg: z.number().nonnegative().optional(),
      rpe: z.number().min(1).max(10).optional(),
    })
  ).optional(),
});

// GET /routines
routinesRouter.get("/", async (req: AuthRequest, res) => {
  const routines = await prisma.routine.findMany({
    where: { userId: req.userId! },
    include: {
      routineExercises: {
        include: { exercise: { select: { id: true, name: true, muscleGroups: true } } },
        orderBy: { order: "asc" },
      },
      folder: true,
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(routines);
});

// GET /routines/library — pre-built programs
routinesRouter.get("/library", async (_req, res) => {
  const routines = await prisma.routine.findMany({
    where: { isPublic: true, userId: null },
    include: {
      routineExercises: {
        include: { exercise: { select: { id: true, name: true, muscleGroups: true } } },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { title: "asc" },
  });
  res.json(routines);
});

// POST /routines
routinesRouter.post("/", async (req: AuthRequest, res) => {
  const parsed = routineSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const routine = await prisma.routine.create({
    data: { ...parsed.data, userId: req.userId! },
    include: { routineExercises: true },
  });
  res.status(201).json(routine);
});

// GET /routines/:id
routinesRouter.get("/:id", async (req: AuthRequest, res) => {
  const routine = await prisma.routine.findUnique({
    where: { id: req.params.id },
    include: {
      routineExercises: {
        include: { exercise: true },
        orderBy: { order: "asc" },
      },
    },
  });
  if (!routine || (routine.userId !== req.userId && !routine.isPublic)) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(routine);
});

// PATCH /routines/:id
routinesRouter.patch("/:id", async (req: AuthRequest, res) => {
  const routine = await prisma.routine.findUnique({ where: { id: req.params.id } });
  if (!routine || routine.userId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const parsed = routineSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const updated = await prisma.routine.update({ where: { id: req.params.id }, data: parsed.data });
  res.json(updated);
});

// DELETE /routines/:id
routinesRouter.delete("/:id", async (req: AuthRequest, res) => {
  const routine = await prisma.routine.findUnique({ where: { id: req.params.id } });
  if (!routine || routine.userId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  await prisma.routine.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// POST /routines/:id/exercises — add exercise to routine
routinesRouter.post("/:id/exercises", async (req: AuthRequest, res) => {
  const routine = await prisma.routine.findUnique({ where: { id: req.params.id } });
  if (!routine || routine.userId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const parsed = exerciseConfigSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const routineId = req.params.id;
  if (!routineId) {
    res.status(400).json({ error: "Missing routine id" });
    return;
  }
  const re = await prisma.routineExercise.create({
    data: {
      routineId,
      exerciseId: parsed.data.exerciseId,
      order: parsed.data.order,
      setsConfig: (parsed.data.setsConfig ?? []) as Prisma.InputJsonValue,
    },
    include: { exercise: true },
  });
  res.status(201).json(re);
});

// DELETE /routines/:id/exercises/:reId
routinesRouter.delete("/:id/exercises/:reId", async (req: AuthRequest, res) => {
  const routine = await prisma.routine.findUnique({ where: { id: req.params.id } });
  if (!routine || routine.userId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  await prisma.routineExercise.delete({ where: { id: req.params.reId } });
  res.json({ ok: true });
});

// POST /routines/:id/copy — copy a public routine to user's library
routinesRouter.post("/:id/copy", async (req: AuthRequest, res) => {
  const source = await prisma.routine.findUnique({
    where: { id: req.params.id },
    include: { routineExercises: true },
  });
  if (!source || !source.isPublic) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const copy = await prisma.routine.create({
    data: {
      userId: req.userId!,
      title: `${source.title} (copy)`,
      description: source.description,
      isPublic: false,
      routineExercises: {
        create: source.routineExercises.map((re) => ({
          exercise: { connect: { id: re.exerciseId } },
          order: re.order,
          setsConfig: re.setsConfig as Prisma.InputJsonValue,
        })),
      },
    },
    include: { routineExercises: { include: { exercise: true }, orderBy: { order: "asc" } } },
  });
  res.status(201).json(copy);
});

// --- Folders ---
// GET /routines/folders
routinesRouter.get("/folders/all", async (req: AuthRequest, res) => {
  const folders = await prisma.routineFolder.findMany({ where: { userId: req.userId! } });
  res.json(folders);
});

// POST /routines/folders
routinesRouter.post("/folders", async (req: AuthRequest, res) => {
  const { name } = req.body as { name: string };
  const folder = await prisma.routineFolder.create({ data: { userId: req.userId!, name } });
  res.status(201).json(folder);
});

// DELETE /routines/folders/:folderId
routinesRouter.delete("/folders/:folderId", async (req: AuthRequest, res) => {
  const result = await prisma.routineFolder.deleteMany({
    where: { id: req.params.folderId, userId: req.userId! },
  });
  if (result.count === 0) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ ok: true });
});
