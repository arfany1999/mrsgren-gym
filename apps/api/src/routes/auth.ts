import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { z } from "zod";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

function signTokens(userId: string) {
  const access = jwt.sign({ sub: userId }, process.env.JWT_SECRET!, { expiresIn: "15m" });
  const refresh = jwt.sign({ sub: userId, type: "refresh" }, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: "30d",
  });
  return { access, refresh };
}

// POST /auth/register
authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { email, password, name, username } = parsed.data;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) {
    res.status(409).json({ error: "Email or username already taken" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, name, username },
    select: { id: true, email: true, name: true, username: true, avatarUrl: true },
  });

  const tokens = signTokens(user.id);
  await redis.set(`refresh:${user.id}`, tokens.refresh, "EX", 60 * 60 * 24 * 30);

  res.status(201).json({ user, ...tokens });
});

// POST /auth/login
authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const tokens = signTokens(user.id);
  await redis.set(`refresh:${user.id}`, tokens.refresh, "EX", 60 * 60 * 24 * 30);

  res.json({
    user: { id: user.id, email: user.email, name: user.name, username: user.username, avatarUrl: user.avatarUrl },
    ...tokens,
  });
});

// POST /auth/refresh
authRouter.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) {
    res.status(400).json({ error: "refreshToken required" });
    return;
  }
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as {
      sub: string;
      type: string;
    };
    if (payload.type !== "refresh") throw new Error("wrong type");

    const stored = await redis.get(`refresh:${payload.sub}`);
    if (stored !== refreshToken) {
      res.status(401).json({ error: "Token reuse detected" });
      return;
    }

    const tokens = signTokens(payload.sub);
    await redis.set(`refresh:${payload.sub}`, tokens.refresh, "EX", 60 * 60 * 24 * 30);
    res.json(tokens);
  } catch {
    res.status(401).json({ error: "Invalid refresh token" });
  }
});

// POST /auth/logout
authRouter.post("/logout", async (req, res) => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (refreshToken) {
    try {
      const payload = jwt.decode(refreshToken) as { sub?: string };
      if (payload?.sub) await redis.del(`refresh:${payload.sub}`);
    } catch {}
  }
  res.json({ ok: true });
});
