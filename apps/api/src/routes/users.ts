import { Router } from "express";

export const usersRouter = Router();

usersRouter.get("/", (_req, res) => {
  res.status(501).json({ message: "Users API coming soon" });
});
