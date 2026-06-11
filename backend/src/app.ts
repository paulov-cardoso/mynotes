import express from "express";
import cors from "cors";
import { logger } from "./lib/logger";

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

export { app };
