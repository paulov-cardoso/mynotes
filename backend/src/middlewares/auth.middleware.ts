import { Request, Response, NextFunction } from "express";
import { verifyAccess } from "../lib/jwt";

export interface AuthRequest extends Request {
  userId: string;
}

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token não fornecido." });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = verifyAccess(token);
    (req as AuthRequest).userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido ou expirado." });
  }
}
