import { Router } from "express";

export const statsRouter = Router();

statsRouter.get("/", (_req, res) => {
  res.status(501).json({ message: "Stats API coming soon" });
});
