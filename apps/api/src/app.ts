import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { authRouter } from "./routes/auth";
import { exercisesRouter } from "./routes/exercises";
import { workoutsRouter } from "./routes/workouts";
import { routinesRouter } from "./routes/routines";
import { statsRouter } from "./routes/stats";
import { socialRouter } from "./routes/social";
import { measurementsRouter } from "./routes/measurements";
import { coachRouter } from "./routes/coach";
import { aiRouter } from "./routes/ai";
import { usersRouter } from "./routes/users";

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.WEB_URL || "http://localhost:3000", credentials: true }));
app.use(morgan("dev"));
app.use(express.json());

app.use("/auth", authRouter);
app.use("/exercises", exercisesRouter);
app.use("/workouts", workoutsRouter);
app.use("/routines", routinesRouter);
app.use("/users", usersRouter);
app.use("/stats", statsRouter);
app.use("/social", socialRouter);
app.use("/measurements", measurementsRouter);
app.use("/coach", coachRouter);
app.use("/ai", aiRouter);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

export { app };
