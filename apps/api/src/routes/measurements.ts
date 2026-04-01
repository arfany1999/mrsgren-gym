import { Router } from "express";

export const measurementsRouter = Router();

measurementsRouter.get("/", (_req, res) => {
  res.status(501).json({ message: "Measurements API coming soon" });
});
