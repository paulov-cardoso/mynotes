import { Response } from 'express'
import { prisma } from '../lib/prisma'
import { AuthRequest } from '../middlewares/auth.middleware'

// ─── Constantes de grid (espelhadas do frontend) ──────────────────────────────

const GRID_COL      = 280
const GRID_ROW      = 260
const COLS_POR_LINHA = 6

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function proximaPosicaoLivre(userId: string, ignorarNoteIds: number[] = []): Promise<{ x: number; y: number }> {
  const notes = await prisma.note.findMany({
    where: { userId, NOT: { id: { in: ignorarNoteIds } } },
    select: { canvasX: true, canvasY: true },
  })

  const blocos = await prisma.bloco.findMany({
    where: { userId },
    select: { canvasX: true, canvasY: true },
  })

  const ocupadas = new Set<string>()
  for (const n of notes) {
    ocupadas.add(`${Math.round(n.canvasX / GRID_COL)},${Math.round(n.canvasY / GRID_ROW)}`)
  }
  for (const b of blocos) {
    ocupadas.add(`${Math.round(b.canvasX / GRID_COL)},${Math.round(b.canvasY / GRID_ROW)}`)
  }

  for (let lin = 0; lin < 9999; lin++) {
    for (let col = 0; col < COLS_POR_LINHA; col++) {
      if (!ocupadas.has(`${col},${lin}`)) {
        return { x: col * GRID_COL, y: lin * GRID_ROW }
      }
    }
  }
  return { x: 0, y: 0 }
}

async function serializarBloco(blocoId: number) {
  const bloco = await prisma.bloco.findUnique({ where: { id: blocoId } })
  if (!bloco) return null

  const notes = await prisma.note.findMany({
    where: { id: { in: bloco.cardIds } },
  })

  const notesMap = new Map(notes.map(n => [n.id, n]))

  const cardsOrdenados = bloco.cardIds
    .map(id => notesMap.get(id))
    .filter(Boolean)
    .map(n => ({
      id:          n!.id,
      titulo:      n!.titulo,
      tituloCapa:  n!.tituloCapa,
      conteudo:    n!.conteudo,
      cor:         n!.cor,
      data:        n!.criadoEm.toLocaleDateString('pt-BR'),
      imagemCapa:  n!.imagemCapa,
      clips:       n!.clips,
      canvasX:     n!.canvasX,
      canvasY:     n!.canvasY,
      canvasOrdem: n!.canvasOrdem,
    }))

  return {
    id:          bloco.id,
    nome:        bloco.nome,
    cardIds:     bloco.cardIds,
    cards:       cardsOrdenados,
    canvasX:     bloco.canvasX,
    canvasY:     bloco.canvasY,
    canvasOrdem: bloco.canvasOrdem,
  }
}

// ─── Controllers ──────────────────────────────────────────────────────────────

export async function listarBlocos(req: AuthRequest, res: Response) {
  const userId = req.userId!

  const blocos = await prisma.bloco.findMany({
    where: { userId },
    orderBy: { canvasOrdem: 'asc' },
  })

  const serializados = await Promise.all(blocos.map(b => serializarBloco(b.id)))
  res.json({ blocos: serializados.filter(Boolean) })
}

export async function criarBloco(req: AuthRequest, res: Response) {
  const userId = req.userId!
  const { nome, cardId, canvasX, canvasY, canvasOrdem } = req.body

  if (!nome?.trim()) {
    res.status(400).json({ error: 'Nome obrigatorio' })
    return
  }
  if (!cardId) {
    res.status(400).json({ error: 'cardId obrigatorio' })
    return
  }

  const note = await prisma.note.findUnique({ where: { id: Number(cardId) } })
  if (!note || note.userId !== userId) {
    res.status(404).json({ error: 'Note nao encontrado' })
    return
  }

  await prisma.note.update({
    where: { id: note.id },
    data: { canvasX: -9999, canvasY: -9999, canvasOrdem: 0 },
  })

  const bloco = await prisma.bloco.create({
    data: {
      userId,
      nome: nome.trim(),
      cardIds: [note.id],
      canvasX: canvasX ?? 0,
      canvasY: canvasY ?? 0,
      canvasOrdem: canvasOrdem ?? 0,
    },
  })

  const serializado = await serializarBloco(bloco.id)
  res.status(201).json({ bloco: serializado })
}

export async function cliparEmBloco(req: AuthRequest, res: Response) {
  const userId  = req.userId!
  const blocoId = Number(req.params.id)
  const { cardId } = req.body

  if (!cardId) {
    res.status(400).json({ error: 'cardId obrigatorio' })
    return
  }

  const bloco = await prisma.bloco.findUnique({ where: { id: blocoId } })
  if (!bloco || bloco.userId !== userId) {
    res.status(404).json({ error: 'Bloco nao encontrado' })
    return
  }

  const note = await prisma.note.findUnique({ where: { id: Number(cardId) } })
  if (!note || note.userId !== userId) {
    res.status(404).json({ error: 'Note nao encontrado' })
    return
  }

  if (bloco.cardIds.includes(note.id)) {
    const serializado = await serializarBloco(bloco.id)
    res.json({ bloco: serializado })
    return
  }

  await prisma.note.update({
    where: { id: note.id },
    data: { canvasX: -9999, canvasY: -9999, canvasOrdem: 0 },
  })

  await prisma.bloco.update({
    where: { id: blocoId },
    data: { cardIds: [note.id, ...bloco.cardIds] },
  })

  const serializado = await serializarBloco(blocoId)
  res.json({ bloco: serializado })
}

export async function removerCardDoBloco(req: AuthRequest, res: Response) {
  const userId  = req.userId!
  const blocoId = Number(req.params.id)
  const { cardId } = req.body

  if (!cardId) {
    res.status(400).json({ error: 'cardId obrigatorio' })
    return
  }

  const bloco = await prisma.bloco.findUnique({ where: { id: blocoId } })
  if (!bloco || bloco.userId !== userId) {
    res.status(404).json({ error: 'Bloco nao encontrado' })
    return
  }

  const novosIds = bloco.cardIds.filter(id => id !== Number(cardId))

  const pos = await proximaPosicaoLivre(userId)
  await prisma.note.update({
    where: { id: Number(cardId) },
    data: { canvasX: pos.x, canvasY: pos.y, canvasOrdem: 0 },
  })

  if (novosIds.length === 0) {
    await prisma.bloco.delete({ where: { id: blocoId } })
    res.json({ blocoDestruido: true })
    return
  }

  await prisma.bloco.update({
    where: { id: blocoId },
    data: { cardIds: novosIds },
  })

  const serializado = await serializarBloco(blocoId)
  res.json({ blocoDestruido: false, bloco: serializado })
}

export async function desfazerBloco(req: AuthRequest, res: Response) {
  const userId  = req.userId!
  const blocoId = Number(req.params.id)

  const bloco = await prisma.bloco.findUnique({ where: { id: blocoId } })
  if (!bloco || bloco.userId !== userId) {
    res.status(404).json({ error: 'Bloco nao encontrado' })
    return
  }

  const cardsRestaurados = []
  for (const cardId of bloco.cardIds) {
    const pos = await proximaPosicaoLivre(userId)
    const note = await prisma.note.update({
      where: { id: cardId },
      data: { canvasX: pos.x, canvasY: pos.y, canvasOrdem: 0 },
    })
    cardsRestaurados.push({
      id:          note.id,
      titulo:      note.titulo,
      tituloCapa:  note.tituloCapa,
      conteudo:    note.conteudo,
      cor:         note.cor,
      data:        note.criadoEm.toLocaleDateString('pt-BR'),
      imagemCapa:  note.imagemCapa,
      clips:       note.clips,
      canvasX:     note.canvasX,
      canvasY:     note.canvasY,
      canvasOrdem: note.canvasOrdem,
    })
  }

  await prisma.bloco.delete({ where: { id: blocoId } })
  res.json({ cardsRestaurados })
}

export async function destruirBloco(req: AuthRequest, res: Response) {
  const userId  = req.userId!
  const blocoId = Number(req.params.id)

  const bloco = await prisma.bloco.findUnique({ where: { id: blocoId } })
  if (!bloco || bloco.userId !== userId) {
    res.status(404).json({ error: 'Bloco nao encontrado' })
    return
  }

  await prisma.note.deleteMany({ where: { id: { in: bloco.cardIds }, userId } })
  await prisma.bloco.delete({ where: { id: blocoId } })

  res.json({ cardsDestruidos: bloco.cardIds })
}

export async function atualizarPosicaoBloco(req: AuthRequest, res: Response) {
  const userId  = req.userId!
  const blocoId = Number(req.params.id)
  const { canvasX, canvasY, canvasOrdem } = req.body

  const bloco = await prisma.bloco.findUnique({ where: { id: blocoId } })
  if (!bloco || bloco.userId !== userId) {
    res.status(404).json({ error: 'Bloco nao encontrado' })
    return
  }

  await prisma.bloco.update({
    where: { id: blocoId },
    data: { canvasX, canvasY, canvasOrdem },
  })

  res.json({ ok: true })
}
