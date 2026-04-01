import { Router } from "express";

export const aiRouter = Router();

aiRouter.get("/", (_req, res) => {
  res.status(501).json({ message: "AI API coming soon" });
});
