import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { z } from "zod";

export const exercisesRouter = Router();

const createSchema = z.object({
  name: z.string().min(1).max(100),
  muscleGroups: z.array(z.string()).min(1),
  equipment: z.string().optional(),
  instructions: z.string().optional(),
  videoUrl: z.string().url().optional(),
});

// GET /exercises
exercisesRouter.get("/", async (req, res) => {
  const { q = "", muscle = "", equipment = "", page = "1", limit = "20" } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where: Record<string, unknown> = {};
  if (q) {
    where.name = { contains: q, mode: "insensitive" };
  }
  if (muscle) {
    where.muscleGroups = { has: muscle };
  }
  if (equipment) {
    where.equipment = { equals: equipment, mode: "insensitive" };
  }

  const [exercises, total] = await Promise.all([
    prisma.exercise.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { name: "asc" },
    }),
    prisma.exercise.count({ where }),
  ]);

  res.json({ exercises, total, page: parseInt(page), limit: parseInt(limit) });
});

// GET /exercises/:id
exercisesRouter.get("/:id", async (req, res) => {
  const exercise = await prisma.exercise.findUnique({ where: { id: req.params.id } });
  if (!exercise) {
    res.status(404).json({ error: "Exercise not found" });
    return;
  }
  res.json(exercise);
});

// POST /exercises (custom exercise, auth required)
exercisesRouter.post("/", requireAuth, async (req: AuthRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const exercise = await prisma.exercise.create({
    data: { ...parsed.data, isCustom: true, createdByUserId: req.userId! },
  });
  res.status(201).json(exercise);
});

// PATCH /exercises/:id
exercisesRouter.patch("/:id", requireAuth, async (req: AuthRequest, res) => {
  const exercise = await prisma.exercise.findUnique({ where: { id: req.params.id } });
  if (!exercise || exercise.createdByUserId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const parsed = createSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const updated = await prisma.exercise.update({ where: { id: req.params.id }, data: parsed.data });
  res.json(updated);
});

// DELETE /exercises/:id
exercisesRouter.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  const exercise = await prisma.exercise.findUnique({ where: { id: req.params.id } });
  if (!exercise || exercise.createdByUserId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  await prisma.exercise.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
