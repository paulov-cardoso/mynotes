import { Response } from 'express'
import { prisma } from '../lib/prisma'
import { AuthRequest } from '../middlewares/auth.middleware'

export async function listarNotes(req: AuthRequest, res: Response) {
  const userId = req.userId

  const notes = await prisma.note.findMany({
    where: { userId },
    orderBy: { canvasOrdem: 'asc' },
  })

  res.json({ notes })
}

export async function criarNote(req: AuthRequest, res: Response) {
  const userId = req.userId
  const { titulo, tituloCapa, conteudo, cor, canvasX, canvasY, canvasOrdem } = req.body

  if (!titulo?.trim()) {
    res.status(400).json({ error: 'Titulo obrigatorio' })
    return
  }
  if (!conteudo?.trim()) {
    res.status(400).json({ error: 'Conteudo obrigatorio' })
    return
  }

  const note = await prisma.note.create({
    data: {
      userId,
      titulo: titulo.trim(),
      tituloCapa: tituloCapa?.trim() ?? '',
      conteudo: conteudo.trim(),
      cor: cor ?? '#ffffff',
      canvasX: canvasX ?? 0,
      canvasY: canvasY ?? 0,
      canvasOrdem: canvasOrdem ?? 0,
    },
  })

  res.status(201).json({ note })
}

export async function atualizarPosicao(req: AuthRequest, res: Response) {
  const userId = req.userId
  const id = Number(req.params.id)
  const { canvasX, canvasY, canvasOrdem } = req.body

  const note = await prisma.note.findUnique({ where: { id } })

  if (!note || note.userId !== userId) {
    res.status(404).json({ error: 'Note nao encontrado' })
    return
  }

  const atualizado = await prisma.note.update({
    where: { id },
    data: { canvasX, canvasY, canvasOrdem },
  })

  res.json({ note: atualizado })
}

export async function excluirNote(req: AuthRequest, res: Response) {
  const userId = req.userId
  const id = Number(req.params.id)

  const note = await prisma.note.findUnique({ where: { id } })

  if (!note || note.userId !== userId) {
    res.status(404).json({ error: 'Note nao encontrado' })
    return
  }

  await prisma.note.delete({ where: { id } })

  res.json({ ok: true })
}
