import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { signAccess, signRefresh, verifyRefresh } from "../lib/jwt";
import { AuthRequest } from "../middlewares/auth.middleware";

const SALT_ROUNDS  = 12;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function serializeUser(user: {
  id: string;
  username: string;
  nomeExibicao: string;
  foto: string | null;
}) {
  return {
    id:           user.id,
    username:     user.username,
    nomeExibicao: user.nomeExibicao,
    foto:         user.foto,
  };
}

export async function registrar(req: Request, res: Response): Promise<void> {
  const { username, nomeExibicao, password1 } = req.body;

  if (!username || !nomeExibicao || !password1) {
    res.status(400).json({ error: "Todos os campos sao obrigatorios." });
    return;
  }

  const existe = await prisma.user.findFirst({
    where: { username },
  });

  if (existe) {
    res.status(409).json({ error: "Username ja cadastrado." });
    return;
  }

  const senhaHash = await bcrypt.hash(password1, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { username, nomeExibicao, senhaHash },
  });

  const access  = signAccess(user.id);
  const refresh = signRefresh(user.id);

  await prisma.refreshToken.create({
    data: {
      token:    refresh,
      userId:   user.id,
      expiraEm: new Date(Date.now() + REFRESH_TTL_MS),
    },
  });

  res.status(201).json({ access, refresh, usuario: serializeUser(user) });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { username, senha } = req.body;

  if (!username || !senha) {
    res.status(400).json({ error: "Username e senha sao obrigatorios." });
    return;
  }

  const user = await prisma.user.findUnique({ where: { username } });

  if (!user) {
    res.status(401).json({ error: "Credenciais invalidas." });
    return;
  }

  const senhaValida = await bcrypt.compare(senha, user.senhaHash);

  if (!senhaValida) {
    res.status(401).json({ error: "Credenciais invalidas." });
    return;
  }

  const access  = signAccess(user.id);
  const refresh = signRefresh(user.id);

  await prisma.refreshToken.create({
    data: {
      token:    refresh,
      userId:   user.id,
      expiraEm: new Date(Date.now() + REFRESH_TTL_MS),
    },
  });

  res.json({ access, refresh, usuario: serializeUser(user) });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const { refresh } = req.body;

  if (!refresh) {
    res.status(400).json({ error: "Refresh token nao fornecido." });
    return;
  }

  await prisma.refreshToken.updateMany({
    where: { token: refresh },
    data:  { revogado: true },
  });

  res.json({ message: "Logout realizado com sucesso." });
}

export async function refreshToken(req: Request, res: Response): Promise<void> {
  const { refresh } = req.body;

  if (!refresh) {
    res.status(400).json({ error: "Refresh token nao fornecido." });
    return;
  }

  try {
    const payload = verifyRefresh(refresh);

    const tokenNoBanco = await prisma.refreshToken.findUnique({
      where: { token: refresh },
    });

    if (!tokenNoBanco || tokenNoBanco.revogado) {
      res.status(401).json({ error: "Refresh token invalido ou revogado." });
      return;
    }

    const novoAccess = signAccess(payload.userId);

    res.json({ access: novoAccess });
  } catch {
    res.status(401).json({ error: "Refresh token invalido ou expirado." });
  }
}

export async function me(req: Request, res: Response): Promise<void> {
  const { userId } = req as AuthRequest;

  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    res.status(404).json({ error: "Usuario nao encontrado." });
    return;
  }

  res.json({ usuario: serializeUser(user) });
}
