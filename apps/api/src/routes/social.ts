import { Router } from "express";

export const socialRouter = Router();

socialRouter.get("/", (_req, res) => {
  res.status(501).json({ message: "Social API coming soon" });
});
