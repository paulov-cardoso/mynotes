import { Router } from "express";
import { registrar, login, logout, refreshToken, me } from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.post("/registrar", registrar);
router.post("/login", login);
router.post("/logout", authenticate, logout);
router.post("/refresh", refreshToken);
router.get("/me", authenticate, me);

export { router as authRouter };
