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

  const imagemCapa = req.file ? `/uploads/notes/${req.file.filename}` : null

  const note = await prisma.note.create({
    data: {
      userId,
      titulo: titulo.trim(),
      tituloCapa: tituloCapa?.trim() ?? '',
      conteudo: conteudo.trim(),
      cor: cor ?? '#ffffff',
      imagemCapa,
      canvasX: canvasX != null ? Number(canvasX) : 0,
      canvasY: canvasY != null ? Number(canvasY) : 0,
      canvasOrdem: canvasOrdem != null ? Number(canvasOrdem) : 0,
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

export async function atualizar(req: Request, res: Response) {
  const userId = (req as any).userId as string
  const id     = Number(req.params.id)

  const note = await prisma.note.findUnique({ where: { id } })
  if (!note || note.userId !== userId) {
    return res.status(404).json({ erro: 'Note não encontrado.' })
  }

  const titulo   = req.body.titulo   ?? note.titulo
  const conteudo = req.body.conteudo ?? note.conteudo
  const cor      = req.body.cor      ?? note.cor

  // Se veio nova imagem, usa o novo caminho; se veio flag de remoção, zera; senão mantém
  let imagemCapa = note.imagemCapa
  if (req.file) {
    imagemCapa = `/uploads/notes/${req.file.filename}`
  } else if (req.body.removerImagem === 'true') {
    imagemCapa = null
  }

  const atualizado = await prisma.note.update({
    where: { id },
    data:  { titulo, conteudo, cor, imagemCapa },
  })

  return res.json({ note: atualizado })
}
