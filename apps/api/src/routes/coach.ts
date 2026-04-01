import { Router } from "express";

export const coachRouter = Router();

coachRouter.get("/", (_req, res) => {
  res.status(501).json({ message: "Coach API coming soon" });
});
