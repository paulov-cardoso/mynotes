// ─── Types ──────────────────────────────────────────────────────────────────

interface Note {
  id: number
  titulo: string
  tituloCapa: string
  conteudo: string
  cor: string
  data: string
  imagemCapa: string | null
  clips: number
  canvasX: number
  canvasY: number
  canvasOrdem: number
}

interface Bloco {
  id: number
  nome: string
  cardIds: number[]
  cards: Note[]
  canvasX: number
  canvasY: number
  canvasOrdem: number
}

// ─── Constants ──────────────────────────────────────────────────────────────

const CARD_W       = 260
const CARD_H       = 220
const GRID_COL     = 280
const GRID_ROW     = 260
const ZOOM_MIN     = 0.35
const ZOOM_MAX     = 2.0
const ZOOM_STEP    = 0.12
const ZOOM_DEFAULT = 1.0
const CANVAS_GAP   = 48
const BUFFER_PX    = 300

// ─── Pure helpers ───────────────────────────────────────────────────────────

function snapToGrid(x: number, y: number) {
  return {
    x: Math.round(x / GRID_COL) * GRID_COL,
    y: Math.round(y / GRID_ROW) * GRID_ROW,
  }
}

