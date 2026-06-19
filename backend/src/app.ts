import express from "express";
import cors from "cors";
import { logger } from "./lib/logger";
import { authRouter } from "./routes/auth.routes";
import notesRoutes from "./routes/notes.routes";
import blocosRoutes from './routes/blocos.routes'

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

app.use("/api/auth", authRouter);
app.use("/api/notes", notesRoutes);
app.use('/api/blocos', blocosRoutes)

export { app };